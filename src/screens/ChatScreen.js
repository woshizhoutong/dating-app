import React, { Component, Fragment } from "react";
import {
  FlatList,
  Image,
  StyleSheet,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StatusBar,
  Modal,
  SafeAreaView,
  Dimensions
} from "react-native";
import PropTypes from "prop-types";
import FastImage from "react-native-fast-image";
import { connect } from "react-redux";
import AppStyles from "../AppStyles";
import ActionSheet from "react-native-actionsheet";
import ImageView from "react-native-image-view";
import DialogInput from "react-native-dialog-input";
import firebase from "react-native-firebase";
import CardDetail from "../components/swipe/cardDetail";
import ImagePicker from "react-native-image-crop-picker";
import { KeyboardAwareView } from "react-native-keyboard-aware-view";
import Icon from "react-native-vector-icons/Ionicons";
import { size } from "../helpers/devices";
import * as Statics from "../helpers/statics";

const HIT_SLOP = { top: 15, left: 15, right: 15, bottom: 15 };

class ChatScreen extends Component {
  static propTypes = {
    user: PropTypes.object,
    navigation: PropTypes.object
  };

  // static navigationOptions = ({ navigation }) => {
  //     let title = navigation.state.params.channel.name;
  //     let isOne2OneChannel = false;
  //     if (!title) {
  //         isOne2OneChannel = true;
  //         title = navigation.state.params.channel.participants[0].firstName;
  //     }
  //     const options = {
  //         title: title,
  //     }
  //     if (!isOne2OneChannel) {
  //         options.headerRight = <TextButton style={AppStyles.styleSet.rightNavButton} onPress={() => navigation.state.params.onSetting()} >Settings</TextButton>
  //     }
  //     return options;
  // };

  constructor(props) {
    super(props);

    const channel = props.navigation.getParam("channel");

    this.state = {
      isRenameDialogVisible: false,
      channel: channel,
      threads: [],
      input: "",
      photo: null,
      downloadUrl: "",
      isImageViewerVisible: false,
      tappedImageIndex: null,
      currentUserProfile: {},
      isUserProfileDetailVisible: false
    };

    this.threadsRef = firebase
      .firestore()
      .collection("channels")
      .doc(channel.id)
      .collection("threads")
      .orderBy("created", "desc");
    this.threadsUnscribe = null;
  }

  componentDidMount() {
    this.threadsUnscribe = this.threadsRef.onSnapshot(
      this.onThreadsCollectionUpdate
    );
    this.props.navigation.setParams({
      onSetting: this.onSetting
    });
  }

  componentWillUnmount() {
    this.threadsUnscribe();

    StatusBar.setHidden(false);
  }

  existSameSentMessage = (messages, newMessage) => {
    for (let i = 0; i < messages.length; i++) {
      const temp = messages[i];

      if (
        newMessage.senderID == temp.senderID &&
        temp.content == newMessage.content &&
        temp.created == newMessage.created
      ) {
        return true;
      }
    }

    return false;
  };

  onThreadsCollectionUpdate = querySnapshot => {
    const data = [];

    querySnapshot.forEach(doc => {
      const message = doc.data();

      message.id = doc.id;

      if (!this.existSameSentMessage(data, message)) {
        data.push(message);
      }
    });

    this.setState({ threads: data });
  };

  onSettingActionDone = index => {
    if (index == 0) {
      this.showRenameDialog(true);
    }
 else if (index == 1) {
      this.onLeave();
    }
  };

  onConfirmActionDone = index => {
    if (index == 0) {
      firebase
        .firestore()
        .collection("channel_participation")
        .where("channel", "==", this.state.channel.id)
        .where("user", "==", this.props.user.userID)
        .get()
        .then(querySnapshot => {
          querySnapshot.forEach(function(doc) {
            doc.ref.delete();
          });
          this.props.navigation.goBack(null);
        });
    }
  };

  onSetting = () => {
    this.settingActionSheet.show();
  };

  onLeave = () => {
    this.confirmLeaveActionSheet.show();
  };

  createOne2OneChannel = () => {
    const channelData = {
      creator_id: this.props.user.userID,
      name: "",
      lastMessage: this.state.input,
      lastMessageDate: firebase.firestore.FieldValue.serverTimestamp()
    };

    const { userID, firstName, profilePictureURL } = this.props.user;

    const that = this;

    firebase
      .firestore()
      .collection("channels")
      .add(channelData)
      .then(function(docRef) {
        channelData.id = docRef.id;
        channelData.participants = that.state.channel.participants;
        that.setState({ channel: channelData });

        const participationData = {
          channel: docRef.id,
          user: that.props.user.userID
        };

        firebase
          .firestore()
          .collection("channel_participation")
          .add(participationData);
        let created = Date.now();

        channelData.participants.forEach(friend => {
          const participationData = {
            channel: docRef.id,
            user: friend.userID
          };

          firebase
            .firestore()
            .collection("channel_participation")
            .add(participationData);

          const data = {
            content: that.state.input,
            created: created,
            recipientFirstName: friend.firstName,
            recipientID: friend.userID,
            recipientLastName: "",
            recipientProfilePictureURL: friend.profilePictureURL,
            senderFirstName: firstName,
            senderID: userID,
            senderLastName: "",
            senderProfilePictureURL: profilePictureURL,
            url: that.state.downloadUrl
          };

          firebase
            .firestore()
            .collection("channels")
            .doc(channelData.id)
            .collection("threads")
            .add(data)
            .then(function() {
              // alert('Successfully sent friend request!');
            })
            .catch(function(error) {
              alert(error);
            });
        });
        firebase
          .firestore()
          .collection("channels")
          .doc(channelData.id)
          .update({ id: channelData.id });
        that.threadsRef = firebase
          .firestore()
          .collection("channels")
          .doc(channelData.id)
          .collection("threads")
          .orderBy("created", "desc");
        that.threadsUnscribe = that.threadsRef.onSnapshot(
          that.onThreadsCollectionUpdate
        );

        that.setState({ input: "", downloadUrl: "", photo: "" });
      })
      .catch(function(error) {
        alert(error);
      });
  };

  uploadPromise = () => {
    const uri = this.state.photo;

    return new Promise(resolve => {
      let filename = uri.substring(uri.lastIndexOf("/") + 1);
      const uploadUri =
        Platform.OS === "ios" ? uri.replace("file://", "") : uri;

      firebase
        .storage()
        .ref(filename)
        .putFile(uploadUri)
        .then(function(snapshot) {
          resolve(snapshot.downloadURL);
        });
    });
  };

  _send = () => {
    if (!this.state.channel.id) {
      this.createOne2OneChannel();
    }
 else {
      const { userID, firstName, profilePictureURL } = this.props.user;
      let created = Date.now();

      this.state.channel.participants.forEach(friend => {
        const data = {
          content: this.state.input,
          created: created,
          recipientFirstName: friend.firstName,
          recipientID: friend.userID,
          recipientLastName: "",
          recipientProfilePictureURL: friend.profilePictureURL,
          senderFirstName: firstName,
          senderID: userID,
          senderLastName: "",
          senderProfilePictureURL: profilePictureURL,
          url: this.state.downloadUrl
        };

        console.log("data is ==", data);

        firebase
          .firestore()
          .collection("channels")
          .doc(this.state.channel.id)
          .collection("threads")
          .add(data)
          .then(function() {
            // alert('Successfully sent friend request!');
          })
          .catch(function(error) {
            alert(error);
          });
      });

      let lastMessage = this.state.downloadUrl;

      if (!lastMessage) {
        lastMessage = this.state.input;
      }

      const channel = { ...this.state.channel };

      delete channel.participants;
      channel.lastMessage = lastMessage;
      channel.lastMessageDate = firebase.firestore.FieldValue.serverTimestamp();

      firebase
        .firestore()
        .collection("channels")
        .doc(this.state.channel.id)
        .set(channel);
      this.setState({ input: "", downloadUrl: "", photo: "" });
    }
  };

  onSend = () => {
    this._send();
  };

  onSelect = () => {
    this.photoUploadDialogActionSheet.show();
  };

  onPhotoUploadDialogDone = index => {
    if (index == 0) {
      this.onLaunchCamera();
    }

    if (index == 1) {
      this.onOpenPhotos();
    }
  };

  onLaunchCamera = () => {
    const { userID, firstName, profilePictureURL } = this.props.user;

    ImagePicker.openCamera({
      cropping: false
    })
      .then(image => {
        const source = image.path;

        const data = {
          content: "",
          created: Date.now(),
          senderFirstName: firstName,
          senderID: userID,
          senderLastName: "",
          senderProfilePictureURL: profilePictureURL,
          url: "http://fake"
        };

        this.startUpload(source, data);
      })
      .catch(function(error) {
        console.log(error);
        this.setState({ loading: false });
      });
  };

  onOpenPhotos = () => {
    const { userID, firstName, profilePictureURL } = this.props.user;

    ImagePicker.openPicker({
      cropping: false
    })
      .then(image => {
        const source = image.path;

        const data = {
          content: "",
          created: Date.now(),
          senderFirstName: firstName,
          senderID: userID,
          senderLastName: "",
          senderProfilePictureURL: profilePictureURL,
          url: "http://fake"
        };

        this.startUpload(source, data);
      })
      .catch(function(error) {
        console.log(error);
        this.setState({ loading: false });
      });
  };

  startUpload = (source, data) => {
    this.setState({
      photo: source,
      threads: [data, ...this.state.threads]
    });

    this.uploadPromise().then(url => {
      this.setState({ downloadUrl: url });
      this._send();
    });
  };

  showRenameDialog = show => {
    this.setState({ isRenameDialogVisible: show });
  };

  onChangeName = text => {
    this.showRenameDialog(false);

    const channel = { ...this.state.channel };

    delete channel.participants;
    channel.name = text;

    firebase
      .firestore()
      .collection("channels")
      .doc(this.state.channel.id)
      .set(channel)
      .then(() => {
        const newChannel = this.state.channel;

        newChannel.name = text;
        this.setState({ channel: newChannel });
        this.props.navigation.setParams({
          channel: newChannel
        });
      });
  };

  onSenderProfilePicturePress = item => {
    this.getGivenUserData(item.senderID, user => {
      this.setState({
        currentUserProfile: user,
        isUserProfileDetailVisible: true
      });
    });
  };

  getGivenUserData = (id, callback) => {
    firebase
      .firestore()
      .collection("users")
      .doc(id)
      .get()
      .then(function(doc) {
        return doc.data();
      })
      .then(function(result) {
        callback(result);
      })
      .catch(function(error) {
        const { message } = error;

        console.log(message);
      });
  };

  formatViewerImages = () => {
    const images = this.state.threads.map(item => {
      if (item.url != "") {
        return {
          id: item.id,
          source: {
            uri: item.url
          },
          width: Dimensions.get("window").width,
          height: Math.floor(Dimensions.get("window").height * 0.6)
        };
      }
    });

    this.cleanedChatImages = images.filter(image => {
      if (image) {
        return image;
      }
    });

    return this.cleanedChatImages;
  };

  onChatItemImagePress = item => {
    const index = this.cleanedChatImages.findIndex(image => {
      return image.id === item.id;
    });

    this.setState({
      tappedImageIndex: index,
      isImageViewerVisible: true
    });
  };

  closeButton = () => (
    <TouchableOpacity
      hitSlop={HIT_SLOP}
      style={styles.closeButton}
      onPress={() => this.setState({ isImageViewerVisible: false })}>
      <Text style={styles.closeButton__text}>×</Text>
    </TouchableOpacity>
  );

  renderChatItem = ({ item }) => (
    <View>
      {item.senderID == this.props.user.userID && (
        <View style={styles.sendItemContainer}>
          {item.url != "" && (
            <TouchableOpacity
              onPress={() => this.onChatItemImagePress(item)}
              style={[
                styles.itemContent,
                styles.sendItemContent,
                { padding: 0 }
              ]}>
              <FastImage
                style={styles.sendPhotoMessage}
                source={{ uri: item.url }}/>
              <Image
                source={AppStyles.iconSet.boederImgSend}
                style={styles.boederImgSend}/>
            </TouchableOpacity>
          )}
          {item.url == "" && (
            <View
              style={[
                styles.itemContent,
                styles.sendItemContent,
                { right: 10, maxWidth: "65%" }
              ]}>
              <Text style={styles.sendTextMessage}>{item.content}</Text>
              <Image
                source={AppStyles.iconSet.textBoederImgSend}
                style={styles.textBoederImgSend}/>
            </View>
          )}
          <TouchableOpacity
            onPress={() => this.onSenderProfilePicturePress(item)}>
            <FastImage
              style={styles.userIcon}
              source={{ uri: item.senderProfilePictureURL }}/>
          </TouchableOpacity>
        </View>
      )}
      {item.senderID != this.props.user.userID && (
        <View style={styles.receiveItemContainer}>
          <TouchableOpacity
            onPress={() => this.onSenderProfilePicturePress(item)}>
            <FastImage
              style={styles.userIcon}
              source={{ uri: item.senderProfilePictureURL }}/>
          </TouchableOpacity>
          {item.url != "" && (
            <View
              style={[
                styles.itemContent,
                styles.receiveItemContent,
                { padding: 0 }
              ]}>
              <FastImage
                style={styles.receivePhotoMessage}
                source={{ uri: item.url }}/>
              <Image
                source={AppStyles.iconSet.boederImgReceive}
                style={styles.boederImgReceive}/>
            </View>
          )}
          {item.url == "" && (
            <View
              style={[
                styles.itemContent,
                styles.receiveItemContent,
                { left: 10, maxWidth: "65%" }
              ]}>
              <Text style={styles.receiveTextMessage}>{item.content}</Text>
              <Image
                source={AppStyles.iconSet.textBoederImgReceive}
                style={styles.textBoederImgReceive}/>
            </View>
          )}
        </View>
      )}
    </View>
  );

  isDisable = () => {
    return !this.state.input;
  };

  sendBtnStyle = () => {
    const style = { padding: 10 };

    if (this.isDisable()) {
      style.opacity = 0.2;
    }
 else {
      style.opacity = 1;
    }

    return style;
  };

  renderCardDetailModal = () => {
    const {
      profilePictureURL,
      firstName,
      age,
      school,
      distance,
      bio,
      photos
    } = this.state.currentUserProfile;

    return (
      <CardDetail
        profilePictureURL={profilePictureURL}
        firstName={firstName}
        age={age}
        school={school}
        distance={distance}
        bio={bio}
        instagramPhotos={photos ? photos : []}
        setShowMode={() => this.setState({ isUserProfileDetailVisible: false })}/>
    );
  };

  render() {
    let title = this.state.channel.name;

    if (!title) {
      if (this.state.channel.participants.length > 0) {
        title = this.state.channel.participants[0].firstName;
      }
    }

    return (
      <Fragment>
        <StatusBar
          hidden={false}
          backgroundColor={Platform.OS == "ios" ? "white" : "black"}
          barStyle={Platform.OS == "ios" ? "dark-content" : "light-content"}/>
        <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
          <View style={styles.container}>
            <View style={styles.navbar}>
              <TouchableOpacity
                style={[
                  styles.header,
                  { flexDirection: "row", justifyContent: "flex-start" }
                ]}
                onPress={() => this.props.navigation.goBack()}>
                <Icon
                  style={styles.bacIcon}
                  name='ios-arrow-back'
                  size={35}
                  color={AppStyles.colorSet.mainThemeForegroundColor}/>
                <Text
                  style={[
                    styles.text,
                    { color: AppStyles.colorSet.mainThemeForegroundColor }
                  ]}>
                  Back
                </Text>
              </TouchableOpacity>
              <View style={styles.header}>
                <Text style={styles.text}>{title}</Text>
              </View>
              <View style={styles.header} />
            </View>
            <KeyboardAwareView style={styles.chats}>
              <FlatList
                inverted={true}
                vertical={true}
                showsVerticalScrollIndicator={false}
                data={this.state.threads}
                renderItem={this.renderChatItem}
                keyExtractor={item => `${item.id}`}/>

              <View style={styles.inputBar}>
                <TouchableOpacity
                  style={styles.btnContainer}
                  onPress={this.onSelect}>
                  <Image
                    style={styles.icon}
                    source={AppStyles.iconSet.camera_filled}/>
                </TouchableOpacity>
                <TextInput
                  style={styles.input}
                  value={this.state.input}
                  multiline={true}
                  onChangeText={text => this.setState({ input: text })}
                  placeholder='Start typing...'
                  underlineColorAndroid='transparent'/>
                <TouchableOpacity
                  disabled={this.isDisable()}
                  style={this.sendBtnStyle()}
                  onPress={this.onSend}>
                  <Image style={styles.icon} source={AppStyles.iconSet.share} />
                </TouchableOpacity>
              </View>
            </KeyboardAwareView>
            <ActionSheet
              ref={o => (this.settingActionSheet = o)}
              title={"Group Settings"}
              options={["Rename Group", "Leave Group", "Cancel"]}
              cancelButtonIndex={2}
              destructiveButtonIndex={1}
              onPress={index => {
                this.onSettingActionDone(index);
              }}/>
            <ActionSheet
              ref={o => (this.confirmLeaveActionSheet = o)}
              title={"Are you sure?"}
              options={["Confirm", "Cancel"]}
              cancelButtonIndex={1}
              destructiveButtonIndex={0}
              onPress={index => {
                this.onConfirmActionDone(index);
              }}/>
            <DialogInput
              isDialogVisible={this.state.isRenameDialogVisible}
              title={"Change Name"}
              hintInput={this.state.channel.name}
              textInputProps={{ selectTextOnFocus: true }}
              submitText={"OK"}
              submitInput={inputText => {
                this.onChangeName(inputText);
              }}
              closeDialog={() => {
                this.showRenameDialog(false);
              }}/>
            <ActionSheet
              ref={o => (this.photoUploadDialogActionSheet = o)}
              title={"Photo Upload"}
              options={["Launch Camera", "Open Photo Gallery", "Cancel"]}
              cancelButtonIndex={2}
              onPress={this.onPhotoUploadDialogDone}/>
            <ImageView
              isSwipeCloseEnabled={false}
              images={this.formatViewerImages()}
              isVisible={this.state.isImageViewerVisible}
              onClose={() => this.setState({ isImageViewerVisible: false })}
              imageIndex={this.state.tappedImageIndex}
              controls={{ close: this.closeButton }}/>
            <Modal
              visible={this.state.isUserProfileDetailVisible}
              animationType={"slide"}>
              <View style={styles.cardDetailContainer}>
                <View style={styles.cardDetailL}>
                  {this.renderCardDetailModal()}
                </View>
              </View>
            </Modal>
          </View>
        </SafeAreaView>
        <SafeAreaView style={{ flex: 0, backgroundColor: "#efeff4" }} />
      </Fragment>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#efeff4"
  },
  navbar: {
    height: Platform.OS === "ios" ? 60 : 69,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: AppStyles.colorSet.mainThemeBackgroundColor
  },
  header: {
    flex: 0.3,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Platform.OS === "ios" ? 18 : 0
  },
  bacIcon: {
    marginHorizontal: 10,
    marginTop: Platform.OS === "ios" ? 0 : 8
  },
  text: {
    fontSize: 20,
    paddingTop: Platform.OS === "ios" ? 0 : 8
  },
  chats: {
    padding: 10,
    flex: 1
  },
  itemContent: {
    padding: 10,
    backgroundColor: AppStyles.colorSet.hairlineColor,
    borderRadius: 10,
    maxWidth: "80%"
  },
  sendItemContainer: {
    justifyContent: "flex-end",
    alignItems: "flex-end",
    flexDirection: "row",
    marginBottom: 10
  },
  userIcon: {
    width: 34,
    height: 34,
    borderRadius: 17
  },
  sendItemContent: {
    marginRight: 10,
    backgroundColor: AppStyles.colorSet.mainThemeForegroundColor
  },
  closeButton: {
    alignSelf: "flex-end",
    height: 24,
    width: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
    marginRight: 15
  },
  closeButton__text: {
    backgroundColor: "transparent",
    fontSize: 35,
    lineHeight: 35,
    color: "#FFF",
    textAlign: "center"
  },
  receiveItemContainer: {
    justifyContent: "flex-start",
    alignItems: "flex-end",
    flexDirection: "row",
    marginBottom: 10
  },
  receiveItemContent: {
    marginLeft: 10
  },
  cardDetailContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)"
  },
  cardDetailL: {
    // position: 'absolute',
    // bottom: 0,
    width: Statics.DEVICE_WIDTH,
    height: Statics.DEVICE_HEIGHT * 0.95,
    // paddingBottom: size(100),
    backgroundColor: "white"
  },
  sendPhotoMessage: {
    width: size(300),
    height: size(250),
    borderRadius: 10
  },
  boederImgSend: {
    position: "absolute",
    width: size(300),
    height: size(250),
    resizeMode: "stretch",
    tintColor: "#efeff4"
  },
  textBoederImgSend: {
    position: "absolute",
    right: -5,
    bottom: 0,
    width: 20,
    height: 8,
    resizeMode: "stretch",
    tintColor: AppStyles.colorSet.mainThemeForegroundColor
  },
  boederImgReceive: {
    position: "absolute",
    width: size(300),
    height: size(250),
    resizeMode: "stretch",
    tintColor: "#efeff4"
  },
  receivePhotoMessage: {
    width: size(300),
    height: size(250),
    borderRadius: 10
  },
  textBoederImgReceive: {
    position: "absolute",
    left: -5,
    bottom: 0,
    width: 20,
    height: 8,
    resizeMode: "stretch",
    tintColor: AppStyles.colorSet.hairlineColor
  },
  sendTextMessage: {
    fontSize: 16,
    color: AppStyles.colorSet.mainThemeBackgroundColor
  },
  receiveTextMessage: {
    color: AppStyles.colorSet.mainTextColor,
    fontSize: 16
  },
  inputBar: {
    justifyContent: "center",
    alignItems: "center",
    borderTopWidth: 2,
    borderTopColor: AppStyles.colorSet.hairlineColor,
    flexDirection: "row",
    marginBottom: 10
  },
  icon: {
    tintColor: AppStyles.colorSet.mainThemeForegroundColor,
    width: 25,
    height: 25
  },
  input: {
    margin: 5,
    paddingTop: 5,
    paddingBottom: 5,
    paddingLeft: 20,
    paddingRight: 20,
    flex: 1,
    backgroundColor: AppStyles.colorSet.grayBgColor,
    fontSize: 16,
    borderRadius: 20
  }
});

const mapStateToProps = state => ({
  user: state.auth.user
});

export default connect(mapStateToProps)(ChatScreen);
