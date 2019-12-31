import React from "react";
import { View, AsyncStorage, StyleSheet } from "react-native";
import PropTypes from "prop-types";
import firebase from "react-native-firebase";
import AppStyles from "../AppStyles";

class LoadScreen extends React.Component {
  static propTypes = {
    user: PropTypes.object,
    navigation: PropTypes.object
  };

  static navigationOptions = {
    header: null
  };

  constructor(props) {
    super(props);

    this.userRef = firebase.firestore().collection("users");
    this.setAppState();
  }

  setAppState() {
    const { navigation } = this.props;

    AsyncStorage.getItem("@shouldShowWalkThrough:value", (err, result) => {
      if (result !== null) {
        AsyncStorage.getItem("@loggedInData:value", async (err, result) => {
          if (result !== null) {
            const user = JSON.parse(result);

            await this.handleIncompleteUserData(user);
            navigation.dispatch({ type: "UPDATE_USER_DATA", user });
            navigation.replace("HomeStack");
          }
 else {
            navigation.replace("LoginStack");
          }

          if (err) {
            console.log(err);
          }
        });
      }
 else {
        navigation.replace("WorkThrough");
        AsyncStorage.setItem(
          "@shouldShowWalkThrough:value",
          JSON.stringify({ value: "true" })
        );
      }

      if (err) {
        console.log(err);
      }
    });
  }

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

        if (profilePictureURL) {
          this.props.navigation.dispatch({
            type: "IS_PROFILE_PICTURE",
            value: true
          });
        }
      }
 else {
        this.props.navigation.dispatch({
          type: "IS_PROFILE_COMPLETE",
          value: true
        });
      }
    }
  };

  render() {
    return <View style={styles.container} />;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppStyles.colorSet.mainThemeForegroundColor
  }
});

export default LoadScreen;
