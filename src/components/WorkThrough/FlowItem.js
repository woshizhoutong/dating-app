import React, { Component } from "react";
import PropTypes from "prop-types";
import { View, Image, Text, StyleSheet } from "react-native";

export default class FlowItem extends Component {
  static propTypes = {
    data: PropTypes.object,
    textColor: PropTypes.string,
    style: PropTypes.any,
    iconpackage: PropTypes.any
  };

  render() {
    const { icon, title, description } = this.props.data;
    const { style, textColor } = this.props;
    const { iconpackage } = this.props;

    return (
      <View style={style}>
        <View style={styles.container}>
          <Image source={iconpackage[icon]} style={styles.icon} />
          <Text style={[textColor, styles.title]}>{title}</Text>
          <Text style={[textColor, styles.description]}>{description}</Text>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: 30,
    paddingRight: 30,
    paddingBottom: 30
  },
  icon: {
    width: 100,
    height: 100,
    marginBottom: 60,
    tintColor: "white"
  },
  title: {
    fontSize: 25,
    fontWeight: "bold",
    textAlign: "center",
    paddingBottom: 25
  },
  description: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center"
  }
});
