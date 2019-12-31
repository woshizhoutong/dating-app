import React from "react";
import {
  AsyncStorage,
  StyleSheet,
  Text,
  TextInput,
  View,
  StatusBar
} from "react-native";
import PropTypes from "prop-types";
import Button from "react-native-button";
import AppStyles from "../AppStyles";
import firebase from "react-native-firebase";
import ActivityModal from "../components/ActivityModal";
import Geolocation from "@react-native-community/geolocation";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

const regexForFullName = /^([a-zA-Z0-9]+|[a-zA-Z0-9]+\s{1}[a-zA-Z0-9]{1,}|[a-zA-Z0-9]+\s{1}[a-zA-Z0-9]{3,}\s{1}[a-zA-Z0-9]{1,})$/;

class SignupScreen extends React.Component {
  static propTypes = {
    user: PropTypes.object,
    navigation: PropTypes.object
  };

  constructor(props) {
    super(props);

    this.state = {
      progress: false,
      loading: true,
      fullname: "",
      phone: "",
      email: "",
      password: ""
    };
    StatusBar.setHidden(true);
  }

  componentDidMount() {
    this.authSubscription = firebase.auth().onAuthStateChanged(() => {
      this.setState({
        loading: false,
        progress: false
      });
    });
  }

  componentWillUnmount() {
    this.authSubscription();
    if (this.usersRef) this.usersRef.update({ isOnline: false });
  }

  getCurrentLocation(geolocation) {
    return new Promise(resolve => {
      geolocation.getCurrentPosition(
        resolve,
        () => resolve({ coords: { latitude: "", longitude: "" } }),
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
      );
    });
  }

  onRegister = () => {
    const _this = this;

    this.setState({ progress: true });
    const { email, password, fullname } = this.state;

    const regexResult = regexForFullName.test(fullname);

    if (!regexResult) {
      alert("Please enter a valid full name.");
      this.setState({ progress: false });

      return null;
    }

    firebase
      .auth()
      .createUserWithEmailAndPassword(email, password)
      .then(async response => {
        const { navigation } = this.props;

        const user_uid = response.user._user.uid;
        const { fullname, phone, email } = this.state;
        const position = await _this.getCurrentLocation(Geolocation);
        const data = {
          id: user_uid,
          userId: user_uid,
          email: email,
          firstName: fullname,
          phone: phone,
          userID: user_uid,
          isOnline: true,
          position: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          },
          created_at: firebase.firestore.FieldValue.serverTimestamp(),
          appIdentifier: "rn-android-dating"
        };

        _this.usersRef = firebase
          .firestore()
          .collection("users")
          .doc(user_uid);
        _this.usersRef.set(data);
        _this.usersRef
          .get()
          .then(function(user) {
            const FCM = firebase.messaging();

            if (
              user.exists &&
              user.data() &&
              user.data().firstName &&
              user.data().userID
            ) {
              FCM.requestPermission();
              // gets the device's push token
              FCM.getToken().then(token => {
                const userData = {
                  ...user.data(),
                  position: {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                  }
                };

                _this.usersRef.update({
                  isOnline: true,
                  pushToken: token,
                  active: true
                });
                AsyncStorage.setItem(
                  "@loggedInData:value",
                  JSON.stringify(userData)
                );
                navigation.dispatch({
                  type: "UPDATE_USER_DATA",
                  user: userData
                });
                navigation.navigate("Swipe");
                navigation.dispatch({ type: "Login" });
                _this.props.navigation.dispatch({
                  type: "IS_FROM_SIGNUP",
                  value: true
                });
                _this.setState({ progress: false });
              });
            }
            else {
              this.setState({ progress: false });
              setTimeout(() => {
                alert("An error occurred, please try again.");
              }, 1000);
            }
          })
          .catch(function(error) {
            const { message } = error;

            this.setState({ progress: false });
            setTimeout(() => {
              alert(message);
            }, 1000);
          });
      })
      .catch(error => {
        const { message } = error;

        this.setState({ progress: false });
        setTimeout(() => {
          alert(message);
        }, 1000);
      });
  };

  render() {
    return (
      <View style={styles.container}>
        <ActivityModal
          loading={this.state.progress}
          title={"Please wait"}
          size={"large"}
          activityColor={"white"}
          titleColor={"white"}
          activityWrapperStyle={{
            backgroundColor: "#595959"
          }}/>
        <Text style={[styles.title, styles.leftTitle]}>Create new account</Text>
        <KeyboardAwareScrollView style={{ flex: 1, width: "100%" }}>
          <View style={styles.InputContainer}>
            <TextInput
              style={styles.body}
              placeholder='Full Name'
              onChangeText={text => this.setState({ fullname: text })}
              value={this.state.fullname}
              underlineColorAndroid='transparent'/>
          </View>
          <View style={styles.InputContainer}>
            <TextInput
              style={styles.body}
              placeholder='Phone Number'
              onChangeText={text => this.setState({ phone: text })}
              value={this.state.phone}
              underlineColorAndroid='transparent'/>
          </View>
          <View style={styles.InputContainer}>
            <TextInput
              style={styles.body}
              placeholder='E-mail Address'
              onChangeText={text => this.setState({ email: text })}
              value={this.state.email}
              underlineColorAndroid='transparent'/>
          </View>
          <View style={[styles.InputContainer, { marginBottom: 50 }]}>
            <TextInput
              style={styles.body}
              placeholder='Password'
              secureTextEntry={true}
              onChangeText={text => this.setState({ password: text })}
              value={this.state.password}
              underlineColorAndroid='transparent'/>
          </View>
          <Button
            containerStyle={styles.facebookContainer}
            style={styles.facebookText}
            onPress={() => this.onRegister()}>
            Sign Up
          </Button>
        </KeyboardAwareScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
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
  InputContainer: {
    width: AppStyles.sizeSet.inputWidth,
    marginTop: 30,
    borderWidth: 1,
    borderStyle: "solid",
    alignSelf: "center",
    borderRadius: AppStyles.sizeSet.radius
  },
  body: {
    height: 42,
    paddingLeft: 20,
    paddingRight: 20,
    color: AppStyles.colorSet.mainTextColor
  },
  facebookContainer: {
    alignSelf: "center",
    width: AppStyles.sizeSet.buttonWidth,
    backgroundColor: "#384c8d",
    borderRadius: AppStyles.sizeSet.radius,
    padding: 10
  },
  facebookText: {
    color: AppStyles.colorSet.mainThemeBackgroundColor
  }
});

export default SignupScreen;
