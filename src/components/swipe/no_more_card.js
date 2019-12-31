import React, { Component } from "react";
import PropTypes from "prop-types";
import { StyleSheet, View, Text } from "react-native";
import FastImage from "react-native-fast-image";
import { size } from "../../helpers/devices";

export default class NoMoreCard extends Component {
  static propTypes = {
    isProfileComplete: PropTypes.bool,
    profilePictureURL: PropTypes.string,
    url: PropTypes.string
  };

  render() {
    return (
      <View style={styles.container}>
        {this.props.isProfileComplete && (
          <FastImage
            source={{ uri: this.props.profilePictureURL }}
            style={styles.user_pic_style}/>
        )}

        {this.props.isProfileComplete ? (
          <Text style={styles.empty_state_text_style}>
            {"There's no one new around you."}
          </Text>
        ) : (
          <View style={{ width: "75%", alignItems: "center" }}>
            <Text style={[styles.empty_state_text_style]}>
              {"Please complete your dating profile to view recommendations."}
            </Text>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  user_pic_style: {
    width: size(90),
    height: size(90),
    borderRadius: size(45),
    marginBottom: size(30)
  },
  empty_state_text_style: {
    fontSize: size(18),
    fontWeight: "500",
    color: "rgba(0,0,0,0.3)",
    textAlign: "center"
  }
});
