import React from "react";
import {
  AsyncStorage,
  Platform,
  Text,
  View,
  Image,
  StyleSheet
} from "react-native";
import PropTypes from "prop-types";
import Button from "react-native-button";
import ActivityModal from "../components/ActivityModal";
import Icon from "react-native-vector-icons/Ionicons";
import firebase from "react-native-firebase";
import ImagePicker from "react-native-image-crop-picker";
import AppStyles from "../AppStyles";
import { connect } from "react-redux";

class AddprofileScreen extends React.Component {
  static propTypes = {
    user: PropTypes.object,
    navigation: PropTypes.object
  };

  constructor(props) {
    super(props);
    this.state = {
      url: null,
      photo: null,
      loading: false
    };
    this.userRef = firebase
      .firestore()
      .collection("users")
      .doc(this.props.user.id);
  }

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
        })
        .catch(function(error) {
          alert(error.message);
        });
    });
  };

  addPhoto() {
    const self = this;

    ImagePicker.openPicker({
      cropping: false
    })
      .then(image => {
        const source = image.path;

        self.setState({
          photo: source,
          loading: true
        });

        self.uploadPromise().then(url => {
          self.setState({
            url,
            loading: false
          });
          // let user_uid = this.props.user.userID;
          let data = {
            profilePictureURL: url,
            photos: [url]
          };

          // firebase.firestore().collection('users').doc(user_uid).update(data);
          self.updateUserInfo(data);
          self.props.navigation.dispatch({ type: "Login" });
          // this.props.navigation.dispatch({ type: 'UPDATE_USER_DATA', user: userData });
        });
      })
      .catch(function(error) {
        console.log(error);
        this.setState({ loading: false });
      });
  }

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
      })
      .catch(function(error) {
        const { message } = error;

        this.setState({ loading: false });

        console.log(message);
      });
  };

  next() {
    this.props.navigation.navigate("Profile", { lastScreen: "Profile" });
  }

  render() {
    return (
      <View style={styles.container}>
        <ActivityModal
          loading={this.state.loading}
          title={"Please wait"}
          size={"large"}
          activityColor={"white"}
          titleColor={"white"}
          activityWrapperStyle={{
            backgroundColor: "#404040"
          }}/>
        <View style={styles.logo}>
          <Text style={styles.title}>Choose Profile Photo</Text>
          {this.state.photo && this.state.url ? (
            <View style={styles.imageView}>
              <Image
                source={{ uri: this.state.photo }}
                style={styles.image_photo}/>
            </View>
          ) : (
            <Icon
              name='md-camera'
              size={100}
              color='#eb5a6d'
              style={styles.icon_camera}/>
          )}
        </View>
        {this.state.url ? (
          <Button
            containerStyle={styles.button}
            style={styles.text}
            onPress={() => this.next()}>
            Next
          </Button>
        ) : (
          <Button
            containerStyle={styles.button}
            style={styles.text}
            onPress={() => this.addPhoto()}>
            Add Profile Photo
          </Button>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between"
  },
  logo: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 50
  },
  title: {
    marginVertical: 20,
    fontSize: 20
  },
  imageView: {
    width: 100,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 15,
    overflow: "hidden",
    marginTop: 20
  },
  image_photo: {
    width: "150%",
    height: "150%",
    resizeMode: "contain"
  },
  icon_camera: {
    marginTop: 20
  },
  button: {
    width: "85%",
    backgroundColor: AppStyles.colorSet.mainThemeForegroundColor,
    borderRadius: 12,
    padding: 15,
    marginBottom: 50
  },
  text: {
    fontSize: 20,
    fontWeight: "bold",
    color: AppStyles.colorSet.mainThemeBackgroundColor
  }
});

const mapStateToProps = state => ({
  user: state.auth.user
});

export default connect(mapStateToProps)(AddprofileScreen);
