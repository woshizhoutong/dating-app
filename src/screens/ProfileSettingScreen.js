import React, { Component, Fragment } from "react";
import {
  AsyncStorage,
  Platform,
  StyleSheet,
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  StatusBar,
  SafeAreaView
} from "react-native";
import PropTypes from "prop-types";
import Icon from "react-native-vector-icons/Ionicons";
import CustomTabBar from "../components/custom_tab_bar";
import Swiper from "react-native-swiper";
import { connect } from "react-redux";
import firebase from "react-native-firebase";
import ImagePicker from "react-native-image-crop-picker";
import ActionSheet from "react-native-actionsheet";
import FastImage from "react-native-fast-image";
import ActivityModal from "../components/ActivityModal";
import AppStyles from "../AppStyles";

class ProfileSettingScreen extends Component {
  static propTypes = {
    user: PropTypes.object,
    navigation: PropTypes.object
  };

  static navigationOptions = {
    header: null
  };

  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      selectedItemIndex: -1,
      myphotos: [[]],
      tabs: [
        AppStyles.iconSet.User,
        AppStyles.iconSet.fireIcon,
        AppStyles.iconSet.Message
      ]
    };
    this.userRef = firebase
      .firestore()
      .collection("users")
      .doc(this.props.user.id);
  }

  componentDidMount() {
    if (this.props.user) {
      this.updatePhotos(this.props.user.photos);
    }

    StatusBar.setHidden(false);
  }

  updatePhotos(photos) {
    let myphotos = [];
    let pphotos = photos ? [...photos] : [];
    let temp = [];

    pphotos.push({ add: true });
    pphotos.map((item, index) => {
      temp.push(item);

      if (index % 6 == 5) {
        myphotos.push(temp);
        temp = [];
      }
 else if (item.add) {
        myphotos.push(temp);
        temp = [];
      }
    });
    this.setState(
      { myphotos, loading: false, selectedItemIndex: -1 },
      () => {}
    );
  }

  goToPage(i) {
    if (i == 0) {
      this.props.navigation.navigate("ProfileSetting");
    }

    if (i == 1) {
      this.props.navigation.navigate("Swipe");
    }

    if (i == 2) {
      this.props.navigation.navigate("Home");
    }
  }

  detail() {
    this.props.navigation.navigate("Profile");
  }
  setting() {
    this.props.navigation.navigate("Setting", { userId: this.props.user.id });
  }
  contact() {
    this.props.navigation.navigate("Contact");
  }
  logout() {
    this.props.navigation.dispatch({ type: "Logout" });
  }

  onSelectAddPhoto = () => {
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
    ImagePicker.openCamera({
      cropping: false
    }).then(image => {
      const source = image.path;

      this.setState({ loading: true });

      this.startUpload(source);
    });
  };

  onOpenPhotos = () => {
    ImagePicker.openPicker({
      cropping: false
    }).then(image => {
      const source = image.path;

      this.setState({ loading: true });
      this.startUpload(source);
    });
  };

  startUpload = source => {
    this.uploadPromise(source)
      .then(url => {
        const { photos } = this.props.user;
        let pphotos = photos ? photos : [];

        pphotos.push(url);
        const data = {
          photos: pphotos
        };

        this.updateUserInfo(data);
        this.updatePhotos(pphotos);
      })
      .catch(function(error) {
        console.log(error);
        this.setState({ loading: false });
      });
  };

  updateUserInfo = data => {
    const self = this;

    self.userRef
      .update(data)
      .then(() => {
        self.userRef
          .get()
          .then(function(doc) {
            return doc.data();
          })
          .then(function(user) {
            console.log("user in AsyncStorage", user);
            AsyncStorage.setItem("@loggedInData:value", JSON.stringify(user));
            self.props.navigation.dispatch({ type: "UPDATE_USER_DATA", user });
          });
        this.setState({ loading: false });
      })
      .catch(function(error) {
        const { message } = error;

        this.setState({ loading: false });

        console.log(message);
      });
  };

  onSelectDelPhoto = index => {
    this.photoDialogActionSheet.show();
    this.setState({ selectedItemIndex: index });
  };

  onPhotoDialogDone = index => {
    const { photos } = this.props.user;
    const { selectedItemIndex } = this.state;

    if (index == 0) {
      this.setState({ loading: true });

      if (photos) {
        photos.splice(selectedItemIndex, 1);
      }

      const data = {
        photos
      };

      this.updateUserInfo(data);
      this.updatePhotos(photos);
    }

    if (index == 2) {
      this.setState({ loading: true });
      const photoToUpdate = photos[selectedItemIndex];

      const data = {
        profilePictureURL: photoToUpdate
      };

      this.updateUserInfo(data);
    }
  };

  uploadPromise = url => {
    const uri = url;

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

  render() {
    const { firstName, lastName, profilePictureURL } = this.props.user;
    const userLastName = this.props.user && lastName ? lastName : " ";
    const userfirstName = this.props.user && firstName ? firstName : " ";
    const { myphotos } = this.state;

    return (
      <Fragment>
        <StatusBar
          hidden={false}
          backgroundColor={Platform.OS == "ios" ? "white" : "black"}
          barStyle={Platform.OS == "ios" ? "dark-content" : "light-content"}/>
        <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
          <View style={styles.MainContainer}>
            <CustomTabBar
              id={0}
              tabs={this.state.tabs}
              goToPage={i => this.goToPage(i)}/>
            <ScrollView style={styles.body}>
              <View style={styles.photoView}>
                <FastImage
                  style={{ width: "100%", height: "100%" }}
                  source={{ uri: profilePictureURL }}/>
              </View>
              <View style={styles.nameView}>
                <Text style={styles.name}>
                  {userfirstName + " " + userLastName}
                </Text>
              </View>
              <View
                style={[
                  styles.myphotosView,
                  myphotos[0].length <= 3 ? { height: 158 } : { height: 268 }
                ]}>
                <View style={styles.itemView}>
                  <Text style={styles.photoTitleLabel}>My Photos</Text>
                </View>
                <Swiper
                  removeClippedSubviews={false}
                  showsButtons={false}
                  loop={false}
                  paginationStyle={{ top: -230, left: null, right: 0 }}
                  dot={<View
                      style={{
                        backgroundColor: "rgba(0,0,0,.2)",
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        marginLeft: 3,
                        marginRight: 3,
                        marginTop: 3,
                        marginBottom: 3
                      }}/>}
                  activeDot={<View
                      style={{
                        backgroundColor: "#db6470",
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        marginLeft: 3,
                        marginRight: 3,
                        marginTop: 3,
                        marginBottom: 3
                      }}/>}>
                  {myphotos.map((photos, i) => (
                    <View key={"photos" + i} style={styles.slide}>
                      <FlatList
                        horizontal={false}
                        numColumns={3}
                        data={photos}
                        scrollEnabled={false}
                        renderItem={({ item, index }) =>
                          item.add ? (
                            <TouchableOpacity
                              key={"item" + index}
                              style={[
                                styles.myphotosItemView,
                                {
                                  backgroundColor:
                                    AppStyles.colorSet.mainThemeForegroundColor
                                }
                              ]}
                              onPress={this.onSelectAddPhoto.bind(this)}>
                              <Icon
                                style={styles.icon}
                                name='ios-camera'
                                size={40}
                                color={AppStyles.colorSet.mainThemeBackgroundColor}/>
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity
                              key={"item" + index}
                              style={styles.myphotosItemView}
                              onPress={() =>
                                this.onSelectDelPhoto(i * 6 + index)}>
                              <FastImage
                                style={{ width: "100%", height: "100%" }}
                                source={{ uri: item }}/>
                            </TouchableOpacity>
                          )}/>
                    </View>
                  ))}
                </Swiper>
              </View>
              <TouchableOpacity
                style={styles.optionView}
                onPress={this.detail.bind(this)}>
                <View style={styles.iconView}>
                  <Image
                    style={{
                      width: 25,
                      height: 25,
                      tintColor: "#687cf0",
                      resizeMode: "cover"
                    }}
                    source={AppStyles.iconSet.account}/>
                </View>
                <View style={styles.textView}>
                  <Text style={styles.textLabel}>Account Details</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.optionView}
                onPress={this.setting.bind(this)}>
                <View style={styles.iconView}>
                  <Image
                    style={{
                      width: 25,
                      height: 25,
                      tintColor: "#484361",
                      resizeMode: "cover"
                    }}
                    source={AppStyles.iconSet.setting}/>
                </View>
                <View style={styles.textView}>
                  <Text style={styles.textLabel}>Settings</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.optionView}
                onPress={this.contact.bind(this)}>
                <View style={styles.iconView}>
                  <Image
                    style={{
                      width: 25,
                      height: 25,
                      tintColor: "#88e398",
                      resizeMode: "cover"
                    }}
                    source={AppStyles.iconSet.callIcon}/>
                </View>
                <View style={styles.textView}>
                  <Text style={styles.textLabel}>Contact Us</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.logoutView}
                onPress={this.logout.bind(this)}>
                <Text style={styles.textLabel}>Logout</Text>
              </TouchableOpacity>
            </ScrollView>
            <ActionSheet
              ref={o => (this.photoDialogActionSheet = o)}
              title={"Photo Dialog"}
              options={["Remove Photo", "Cancel", "Make Profile Picture"]}
              cancelButtonIndex={1}
              destructiveButtonIndex={0}
              onPress={this.onPhotoDialogDone}/>
            <ActionSheet
              ref={o => (this.photoUploadDialogActionSheet = o)}
              title={"Photo Upload"}
              options={["Launch Camera", "Open Photo Gallery", "Cancel"]}
              cancelButtonIndex={2}
              onPress={this.onPhotoUploadDialogDone}/>
            <ActivityModal
              loading={this.state.loading}
              title={"Please wait"}
              size={"large"}
              activityColor={"white"}
              titleColor={"white"}
              activityWrapperStyle={{
                backgroundColor: "#404040"
              }}/>
          </View>
        </SafeAreaView>
      </Fragment>
    );
  }
}

const styles = StyleSheet.create({
  MainContainer: {
    flex: 1
  },
  body: {
    width: "100%"
  },
  photoView: {
    top: Platform.OS === "ios" ? "4%" : "1%",
    width: 146,
    height: 146,
    borderRadius: 73,
    backgroundColor: "grey",
    overflow: "hidden",
    alignSelf: "center"
  },
  nameView: {
    width: "100%",
    marginTop: 45,
    justifyContent: "center",
    alignItems: "center"
  },
  name: {
    fontSize: 21,
    fontWeight: "bold",
    // marginRight: 10,
    color: "#262626",
    padding: 10
  },
  myphotosView: {
    width: "100%",
    paddingHorizontal: 12,
    marginTop: 20,
    marginBottom: 15
  },
  itemView: {
    width: "100%",
    paddingVertical: 2,
    marginVertical: 2,
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    marginBottom: 11
  },
  slide: {
    flex: 1,
    justifyContent: "center",
    alignItems: "flex-start"
  },
  myphotosItemView: {
    width: 100,
    height: 100,
    marginHorizontal: 8,
    marginVertical: 8,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "grey",
    overflow: "hidden"
  },
  optionView: {
    width: "100%",
    marginVertical: 9,
    paddingHorizontal: 12,
    flexDirection: "row"
  },
  iconView: {
    flex: 0.2,
    justifyContent: "center",
    alignItems: "center"
  },
  textView: {
    flex: 0.8,
    justifyContent: "center",
    alignItems: "flex-start"
  },
  textLabel: {
    fontSize: 16,
    color: "#262626"
  },
  photoTitleLabel: {
    fontWeight: "500",
    fontSize: 17,
    paddingLeft: 7,
    color: "#262626"
  },
  logoutView: {
    width: "92%",
    marginTop: 20,
    marginBottom: 50,
    marginHorizontal: 12,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: AppStyles.colorSet.inputBgColor,
    justifyContent: "center",
    alignItems: "center"
  }
});

const mapStateToProps = state => ({
  user: state.auth.user
});

export default connect(mapStateToProps)(ProfileSettingScreen);
