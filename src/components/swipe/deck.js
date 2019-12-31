import React from "react";
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  Animated,
  PanResponder,
  Modal
} from "react-native";
import PropTypes from "prop-types";
import BottomTabBar from "./bottom_tab_bar";
import * as Statics from "../../helpers/statics";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const SCREEN_WIDTH = Dimensions.get("window").width;

export default class App extends React.Component {
  static propTypes = {
    renderNewMatch: PropTypes.func,
    showMode: PropTypes.number,
    onSwipe: PropTypes.func,
    onSwipeLeft: PropTypes.func,
    onSwipeRight: PropTypes.func,
    data: PropTypes.array.isRequired,
    renderCard: PropTypes.func.isRequired,
    renderCardDetail: PropTypes.func.isRequired,
    renderNoMoreCards: PropTypes.func.isRequired
  };

  constructor() {
    super();

    this.position = new Animated.ValueXY();
    this.state = {
      currentIndex: 0
    };

    this.rotate = this.position.x.interpolate({
      inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      outputRange: ["-30deg", "0deg", "10deg"],
      extrapolate: "clamp"
    });

    this.rotateAndTranslate = {
      transform: [
        {
          rotate: this.rotate
        },
        ...this.position.getTranslateTransform()
      ]
    };

    this.likeOpacity = this.position.x.interpolate({
      inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      outputRange: [0, 0, 1],
      extrapolate: "clamp"
    });
    this.dislikeOpacity = this.position.x.interpolate({
      inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      outputRange: [1, 0, 0],
      extrapolate: "clamp"
    });

    this.nextCardOpacity = this.position.x.interpolate({
      inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      outputRange: [1, 0, 1],
      extrapolate: "clamp"
    });
    this.nextCardScale = this.position.x.interpolate({
      inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      outputRange: [1, 0.8, 1],
      extrapolate: "clamp"
    });
  }
  componentWillMount() {
    this.PanResponder = PanResponder.create({
      // onStartShouldSetPanResponder: (evt, gestureState) => true,
      onStartShouldSetPanResponder: (evt, gestureState) => {
        return false;
      },
      onStartShouldSetPanResponderCapture: (evt, gestureState) => {
        return false;
      },
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
        return false;
      },
      onPanResponderMove: (evt, gestureState) => {
        this.position.setValue({ x: gestureState.dx, y: gestureState.dy });
      },
      onPanResponderEnd: (evt, gestureState) => {
        if (gestureState.dx > 120) {
          const { onSwipeRight, data } = this.props;
          const item = data[this.state.currentIndex];

          Animated.spring(this.position, {
            toValue: { x: SCREEN_WIDTH + 100, y: gestureState.dy }
          }).start(() => {
            this.setState({ currentIndex: this.state.currentIndex + 1 }, () => {
              this.position.setValue({ x: 0, y: 0 });
              onSwipeRight(item, this.state.currentIndex);
            });
          });
        } else if (gestureState.dx < -120) {
          const { onSwipeLeft, data } = this.props;
          const item = data[this.state.currentIndex];

          Animated.spring(this.position, {
            toValue: { x: -SCREEN_WIDTH - 100, y: gestureState.dy }
          }).start(() => {
            this.setState({ currentIndex: this.state.currentIndex + 1 }, () => {
              this.position.setValue({ x: 0, y: 0 });
              onSwipeLeft(item, this.state.currentIndex);
            });
          });
        } else {
          Animated.spring(this.position, {
            toValue: { x: 0, y: 0 },
            friction: 4
          }).start();
        }
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const { dx, dy } = gestureState;

        return dx > 2 || dx < -2 || dy > 2 || dy < -2;

        // return !(gestureState.dx === 0 && gestureState.dy === 0);
      }
    });
  }

  onSwipeFromCardDetail = direction => {
    if (direction === "left") {
      this.onDislikePressed();
    } else {
      this.onLikePressed();
    }
  };

  onDislikePressed = () => {
    const { onSwipeLeft, data } = this.props;
    const item = data[this.state.currentIndex];

    Animated.spring(this.position, {
      toValue: { x: -SCREEN_WIDTH - 100, y: 0 }
    }).start(() => {
      this.setState({ currentIndex: this.state.currentIndex + 1 }, () => {
        this.position.setValue({ x: 0, y: 0 });
        onSwipeLeft(item, this.state.currentIndex);
      });
    });
  };

  onLikePressed = () => {
    const { onSwipeRight, data } = this.props;
    const item = data[this.state.currentIndex];

    Animated.spring(this.position, {
      toValue: { x: SCREEN_WIDTH + 100, y: 0 }
    }).start(() => {
      this.setState({ currentIndex: this.state.currentIndex + 1 }, () => {
        this.position.setValue({ x: 0, y: 0 });
        onSwipeRight(item, this.state.currentIndex);
      });
    });
  };

  renderBottomTabBar(containerStyle, buttonContainerStyle) {
    const { isDone } = this.state;

    return (
      <View style={{ marginBottom: -8 }}>
        <BottomTabBar
          isDone={isDone}
          onDislikePressed={this.onDislikePressed}
          onSuperLikePressed={this.onLikePressed}
          onLikePressed={this.onLikePressed}
          containerStyle={containerStyle}
          buttonContainerStyle={buttonContainerStyle}
        />
      </View>
    );
  }

  renderCards = () => {
    const { renderCard, renderNoMoreCards, data } = this.props;

    if (this.state.currentIndex >= data.length) {
      return <View style={styles.noMoreCards}>{renderNoMoreCards()}</View>;
    }

    return data
      .map((item, i) => {
        if (i < this.state.currentIndex) {
          return null;
        } else if (i == this.state.currentIndex) {
          return (
            <Animated.View
              {...this.PanResponder.panHandlers}
              key={item.id}
              style={[this.rotateAndTranslate, styles.topCardContainer]}
            >
              <Animated.View
                style={[
                  {
                    opacity: this.likeOpacity,
                    transform: [{ rotate: "-30deg" }]
                  },
                  styles.likeTextContainer
                ]}
              >
                <Text style={styles.likeText}>LIKE</Text>
              </Animated.View>

              <Animated.View
                style={[
                  {
                    opacity: this.dislikeOpacity,
                    transform: [{ rotate: "30deg" }]
                  },
                  styles.nopeTextContainer
                ]}
              >
                <Text style={styles.nopeText}>NOPE</Text>
              </Animated.View>

              {/* <Image style={styles.deckImage} source={{ uri: item.uri }} /> */}
              {renderCard(item)}
            </Animated.View>
          );
        } else {
          return (
            <Animated.View
              key={item.id}
              style={[
                {
                  opacity: this.nextCardOpacity,
                  transform: [{ scale: this.nextCardScale }]
                },
                styles.topCardContainer
              ]}
            >
              <Animated.View
                style={[
                  {
                    opacity: 0,
                    transform: [{ rotate: "-30deg" }]
                  },
                  styles.likeTextContainer
                ]}
              >
                <Text style={styles.likeText}>LIKE</Text>
              </Animated.View>

              <Animated.View
                style={[
                  {
                    opacity: 0,
                    transform: [{ rotate: "30deg" }]
                  },
                  styles.nopeTextContainer
                ]}
              >
                <Text style={styles.nopeText}>NOPE</Text>
              </Animated.View>

              {/* <Image style={styles.deckImage} source={{ uri: item.uri }} /> */}
              {renderCard(item)}
            </Animated.View>
          );
        }
      })
      .reverse();
  };

  render() {
    const { currentIndex } = this.state;
    const { showMode, renderCardDetail, data, renderNewMatch } = this.props;

    return (
      <View style={styles.container}>
        {this.renderCards()}
        {showMode == 1 && data[currentIndex] && (
          <Modal visible={this.state.isDialogVisible} animationType={"slide"}>
            <View style={styles.cardDetailContainer}>
              <View style={styles.cardDetailL}>
                {renderCardDetail(data[currentIndex], this.state.isdone)}
              </View>
            </View>
          </Modal>
        )}
        {this.renderBottomTabBar()}
        {showMode == 2 && (
          <Modal
            transparent={false}
            visible={showMode == 2 ? true : false}
            animationType={"slide"}
          >
            <View style={styles.newMatch}>{renderNewMatch()}</View>
          </Modal>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end"
  },
  cardStyle: {
    position: "absolute",
    top: 0,
    bottom: 50,
    left: 0,
    right: 0,
    width: Statics.DEVICE_WIDTH
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
  newMatch: {
    // position: 'absolute',
    // bottom: 0,
    width: Statics.DEVICE_WIDTH,
    height: Statics.DEVICE_HEIGHT,
    backgroundColor: "white"
  },
  noMoreCards: {
    position: "absolute",
    top: 0,
    bottom: 50,
    left: 0,
    right: 0,
    width: Statics.DEVICE_WIDTH
  },
  topCardContainer: {
    height: SCREEN_HEIGHT - 120,
    width: SCREEN_WIDTH,
    padding: 10,
    position: "absolute"
  },
  nopeText: {
    borderWidth: 1,
    borderColor: "red",
    color: "red",
    fontSize: 32,
    fontWeight: "800",
    padding: 10
  },
  likeText: {
    borderWidth: 1,
    borderColor: "green",
    color: "green",
    fontSize: 32,
    fontWeight: "800",
    padding: 10
  },
  likeTextContainer: {
    position: "absolute",
    top: 50,
    left: 40,
    zIndex: 1000
  },
  nopeTextContainer: {
    position: "absolute",
    top: 50,
    right: 40,
    zIndex: 1000
  }
});
