import React from "react";
import PropTypes from "prop-types";
import { StyleSheet, View } from "react-native";
import firebase from "react-native-firebase";

import AppStyles from "../AppStyles";

import FastImage from "react-native-fast-image";

export default class AvatorView extends React.Component {
  static propTypes = {
    user: PropTypes.object,
    style: PropTypes.any
  };

  constructor(props) {
    super(props);
    this.state = {
      profilePictureURL: ""
      // isOnline: false
    };
  }

  componentDidMount() {
    const user_uid = this.props.user.userID;
    const _this = this;

    this.usersUnsubscribe = firebase
      .firestore()
      .collection("users")
      .doc(user_uid)
      .onSnapshot(function(user) {
        console.log("friend", user.data());

        if (user.exists) {
          _this.setState({
            profilePictureURL: user.data().profilePictureURL
            // isOnline: user.data().isOnline
          });
        }
      });
  }

  componentWillUnmount() {
    if (this.usersUnsubscribe) this.usersUnsubscribe();
  }

  render() {
    const { profilePictureURL } = this.state;

    return (
      <View style={[styles.container, this.props.style]}>
        <FastImage
          style={styles.profileIcon}
          source={{ uri: profilePictureURL }}/>
        <View
          style={[
            styles.onlineView,
            this.props.user.active
              ? {
                  backgroundColor: AppStyles.colorSet.mainThemeForegroundColor
                }
              : { backgroundColor: "gray" }
          ]}/>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {},
  profileIcon: {
    height: 60,
    width: 60,
    borderRadius: 30
  },
  onlineView: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: "white"
  }
});
