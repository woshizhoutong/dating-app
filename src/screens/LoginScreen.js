import React from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
  StatusBar,
  AsyncStorage
} from "react-native";
import PropTypes from "prop-types";
import Button from "react-native-button";
import firebase from "react-native-firebase";
import ActivityModal from "../components/ActivityModal";
import AppStyles from "../AppStyles";

const FBSDK = require("react-native-fbsdk");
const { LoginManager, AccessToken } = FBSDK;

class LoginScreen extends React.Component {
  static propTypes = {
    user: PropTypes.object,
    navigation: PropTypes.object
  };

  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      email: "",
      password: ""
    };
    StatusBar.setHidden(true);
  }

  componentWillUnmount() {
    if (this.usersRef) this.usersRef.update({ isOnline: false });
  }

  loginWithFb = async () => {
    const _this = this;

    LoginManager.logOut();

    try {
      this.setState({ loading: true });
      const result = await LoginManager.logInWithPermissions([
        "public_profile",
        "user_friends",
        "email"
      ]);

      if (result.isCancelled) {
        _this.setState({ loading: false });
        setTimeout(() => {
          alert(
            "Whoops! Something went wrong. Please try again.",
            "You cancelled the sign in."
          );
        }, 1000);
      }
 else {
        const data = await AccessToken.getCurrentAccessToken();
        const credential = await firebase.auth.FacebookAuthProvider.credential(
          data.accessToken
        );

        if (result.error) {
          console.log("Error: ", result.error);

          _this.setState({ loading: false });
          setTimeout(() => {
            Alert.alert("Network is disconnected");
          }, 1000);

          return;
        }

        const response = await firebase.auth().signInWithCredential(credential);

        const isNewUser = response.additionalUserInfo.isNewUser;
        const { first_name, last_name } = response.additionalUserInfo.profile;
        const { uid, email, phoneNumber, photoURL } = response.user._user;

        _this.usersRef = firebase
          .firestore()
          .collection("users")
          .doc(uid);

        if (isNewUser) {
          const userData = {
            id: uid,
            email: email,
            firstName: first_name,
            lastName: last_name,
            phone: phoneNumber,
            profilePictureURL: photoURL,
            userID: uid,
            isOnline: true,
            created_at: firebase.firestore.FieldValue.serverTimestamp(),
            appIdentifier: "rn-android-dating",
            active: true
          };

          _this.usersRef.set(userData);
        }

        const user_uid = uid;

        _this.usersRef = firebase
          .firestore()
          .collection("users")
          .doc(user_uid);

        const user = await this.usersRef.get();

        console.log("the logged in user is ==", user.data());

        if (
          user.exists &&
          user.data() &&
          user.data().firstName &&
          user.data().userID
        ) {
          const FCM = firebase.messaging();
          const enabled = FCM.hasPermission();

          // await this.getCurrentLocation();

          if (enabled) {
            await this.handleFirebaseMessaging(user_uid, user);
          }
 else {
            _this.setState({ loading: false });

            setTimeout(async () => {
              try {
                await firebase.messaging().requestPermission();
                _this.setState({ loading: true }, async () => {
                  await this.handleFirebaseMessaging(user_uid, user);
                });
              }
 catch (error) {
                _this.setState({ loading: true });
                this.handleFirebaseMessaging(user_uid, user);
              }
            }, 1000);
          }
        }
 else {
          _this.setState({ loading: false });
          setTimeout(() => {
            alert("user does not exist!");
          }, 1000);
        }
      }
    }
 catch (error) {
      const { message } = error;

      _this.setState({ loading: false });
      setTimeout(() => {
        alert(message);
      }, 1000);
    }
  };

  onPressLogin = async () => {
    const _this = this;
    const { email, password } = this.state;

    if (!email || !password) {
      alert("Password and E-mail field can not be empty.");

      return null;
    }

    this.setState({ loading: true });

    try {
      const response = await firebase
        .auth()
        .signInWithEmailAndPassword(email, password);
      const user_uid = response.user._user.uid;

      this.usersRef = firebase
        .firestore()
        .collection("users")
        .doc(user_uid);

      const user = await this.usersRef.get();

      console.log("the logged in user is ==", user.data());

      if (
        user.exists &&
        user.data() &&
        user.data().firstName &&
        user.data().userID
      ) {
        const FCM = firebase.messaging();
        const enabled = FCM.hasPermission();

        // await this.getCurrentLocation();

        if (enabled) {
          await this.handleFirebaseMessaging(user_uid, user);
        }
 else {
          _this.setState({ loading: false });

          setTimeout(async () => {
            try {
              await firebase.messaging().requestPermission();
              _this.setState({ loading: true }, async () => {
                await this.handleFirebaseMessaging(user_uid, user);
              });
            }
 catch (error) {
              _this.setState({ loading: true });
              this.handleFirebaseMessaging(user_uid, user);
            }
          }, 1000);
        }
      }
 else {
        _this.setState({ loading: false });
        setTimeout(() => {
          alert("user does not exist!");
        }, 1000);
      }
    }
 catch (error) {
      const { message } = error;

      _this.setState({ loading: false });
      setTimeout(() => {
        alert(message);
      }, 1000);
    }
  };


  handleIncompleteUserData = user => {
    if (user) {
      const {
        firstName,
        lastName,
        age,
        email,
        profilePictureURL,
        gender,
        genderPre
      } = user;

      if (
        !firstName ||
        !lastName ||
        !age ||
        !email ||
        !profilePictureURL ||
        !gender ||
        !genderPre
      ) {
        this.props.navigation.dispatch({
          type: "IS_PROFILE_COMPLETE",
          value: false
        });

        // if (profilePictureURL) {
        //   this.props.navigation.dispatch({
        //     type: "IS_PROFILE_PICTURE",
        //     value: true
        //   });
        // }
      }
 else {
        this.props.navigation.dispatch({
          type: "IS_PROFILE_COMPLETE",
          value: true
        });
      }
    }
  };

  handleFirebaseMessaging = async (user_uid, user) => {
    const { navigation } = this.props;
    const self = this;
    const FCM = firebase.messaging();

    const token = await FCM.getToken();
    const userData = {
      ...user.data(),
      active: true,
      id: user_uid,
      pushToken: token
    };

    await self.usersRef.update({
      isOnline: true,
      pushToken: token,
      appIdentifier: "rn-android-dating",
      active: true,
      id: user_uid
    });

    await AsyncStorage.setItem("@loggedInData:value", JSON.stringify(userData));
    await navigation.dispatch({
      type: "UPDATE_USER_DATA",
      user: userData
    });
    self.handleIncompleteUserData(userData);
    self.setState({ loading: false });
    setTimeout(() => {
      navigation.navigate("Swipe");
    }, 500);

    // self.setState({ loading: false }, () => {
    //   navigation.navigate("Swipe");
    // });
  };

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
        <Text style={[styles.title, styles.leftTitle]}>Sign In</Text>
        <View style={styles.InputContainer}>
          <TextInput
            style={styles.body}
            placeholder='E-mail or phone number'
            onChangeText={text => this.setState({ email: text })}
            value={this.state.email}
            underlineColorAndroid='transparent'/>
        </View>
        <View style={[styles.InputContainer, { marginBottom: 30 }]}>
          <TextInput
            style={styles.body}
            secureTextEntry={true}
            placeholder='Password'
            onChangeText={text => this.setState({ password: text })}
            value={this.state.password}
            underlineColorAndroid='transparent'/>
        </View>
        <Button
          containerStyle={styles.loginContainer}
          style={styles.loginText}
          onPress={this.onPressLogin}>
          Log in
        </Button>
        <View style={styles.orView}>
          <Text style={styles.orText}>OR</Text>
        </View>
        <Button
          containerStyle={[
            styles.loginContainer,
            { marginTop: 0, backgroundColor: "#384c8d" }
          ]}
          style={styles.loginText}
          onPress={this.loginWithFb}>
          Facebook Login
        </Button>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center"
  },
  title: {
    fontSize: AppStyles.fontSet.xlarge,
    fontWeight: "bold",
    color: AppStyles.colorSet.mainThemeForegroundColor,
    marginTop: 20,
    marginBottom: 20
  },
  leftTitle: {
    alignSelf: "stretch",
    textAlign: "left",
    marginLeft: 20
  },
  loginContainer: {
    width: AppStyles.sizeSet.buttonWidth,
    backgroundColor: AppStyles.colorSet.mainThemeForegroundColor,
    borderRadius: AppStyles.sizeSet.radius,
    padding: 12
  },
  loginText: {
    fontSize: 22,
    fontWeight: "bold",
    color: AppStyles.colorSet.mainThemeBackgroundColor
  },
  InputContainer: {
    width: "85%",
    marginTop: 30,
    borderWidth: 1,
    borderStyle: "solid",
    borderRadius: AppStyles.sizeSet.radius
  },
  body: {
    height: 45,
    paddingLeft: 20,
    paddingRight: 20,
    color: AppStyles.colorSet.mainTextColor
  },
  orView: {
    marginTop: 50,
    marginBottom: 30
  },
  orText: {
    fontSize: 18
  }
});

export default LoginScreen;
