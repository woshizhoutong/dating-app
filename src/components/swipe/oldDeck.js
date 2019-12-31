// import React, { Component } from "react";
// import PropTypes from "prop-types";
// import { StyleSheet, View, Animated, Platform, Modal } from "react-native";
// import Interactable from "react-native-interactable";
// import Interactable from "react-native-interactive";
// import BottomTabBar from "./bottom_tab_bar";
// import * as Statics from "../../helpers/statics";

// const SWIPE_THRESHOLD = 0.75 * Statics.DEVICE_WIDTH;

// const transformValue = Platform.select({ ios: "10deg", android: "5deg" });

// export default class Deck extends Component {
//   static propTypes = {
//     renderNewMatch: PropTypes.func,
//     showMode: PropTypes.number,
//     onSwipe: PropTypes.func,
//     onSwipeLeft: PropTypes.func,
//     onSwipeRight: PropTypes.func,
//     data: PropTypes.array.isRequired,
//     renderCard: PropTypes.func.isRequired,
//     renderCardDetail: PropTypes.func.isRequired,
//     renderNoMoreCards: PropTypes.func.isRequired
//   };

//   static defaultProps = {
//     onSwipeLeft: () => {},
//     onSwipeRight: () => {}
//   };

//   constructor(props) {
//     super(props);
//     const position = new Animated.Value(0);

//     this.state = {
//       position,
//       index: 0,
//       isDone: false
//     };
//     this.InteractableRef = React.createRef();
//   }

//   UNSAFE_componentWillReceiveProps(props) {
//     if (props.data !== this.props.data) {
//       console.log("componentWillReceiveProps", props.data);
//       this.setState({
//         index: 0,
//         isDone: false
//       });
//     }
//   }

//   onSwipeComplete(direction) {
//     console.log("onSwipeComplete called with type==", direction);

//     // const { data } = this.props;
//     // const item = data[this.state.index];

//     if (this.state.index <= this.props.data.length - 1) {
//       if (direction === "left") {
//         this.InteractableRef.current.snapTo({ index: 2 });
//       } else {
//         this.InteractableRef.current.snapTo({ index: 0 });
//       }

//       // this.props.onSwipe(direction, item, this.state.index);
//     }
//   }

//   controlCardLeaving(event, index) {
//     console.log("controlCardLeaving called with type==", event);
//     const { onSwipeLeft, onSwipeRight, data } = this.props;
//     const item = data[this.state.index];

//     if (event.left === "enter") {
//       onSwipeLeft(item, index);
//       this.state.position.setValue(0);
//       this.setState({
//         index: this.state.index + 1
//       });
//     } else if (event.right === "enter") {
//       onSwipeRight(item, index);
//       this.state.position.setValue(0);
//       this.setState({
//         index: this.state.index + 1
//       });
//     } else {
//       console.log("else");
//     }
//   }

//   renderCards() {
//     const { index, position } = this.state;
//     const { renderCard, renderNoMoreCards, data } = this.props;

//     if (index >= data.length) {
//       return <View style={styles.noMoreCards}>{renderNoMoreCards()}</View>;
//       // this.setState({isDone: true})
//     } else {
//       return data
//         .map((item, i) => {
//           const androidStyle = {
//             elevation: -i * 10
//           };

//           if (i < index) {
//             return null;
//           }

//           if (i === index) {
//             return (
//               <Interactable.View
//                 ref={this.InteractableRef}
//                 style={[styles.cardStyle, androidStyle]}
//                 key={item.userID + ""}
//                 snapPoints={[{ x: 390 }, { x: 0, damping: 0.7 }, { x: -390 }]}
//                 animatedValueX={position}
//                 onAlert={event =>
//                   this.controlCardLeaving(event.nativeEvent, index)
//                 }
//                 alertAreas={[
//                   { id: "right", influenceArea: { left: SWIPE_THRESHOLD } },
//                   { id: "left", influenceArea: { right: -SWIPE_THRESHOLD } }
//                 ]}
//               >
//                 <Animated.View
//                   key={item.userID + ""}
//                   style={[
//                     { marginBottom: 100 },
//                     {
//                       transform: [
//                         {
//                           rotate: position.interpolate({
//                             inputRange: [-300, 0, 300],
//                             outputRange: [
//                               `-${transformValue}`,
//                               "0deg",
//                               transformValue
//                             ]
//                           })
//                         }
//                       ]
//                     }
//                   ]}
//                 >
//                   {renderCard(item)}
//                 </Animated.View>
//               </Interactable.View>
//             );
//           }

//           return (
//             <Interactable.View
//               style={[styles.cardStyle, androidStyle]}
//               key={item.userID}
//               horizontalOnly={false}
//               animatedValueX={position}
//             >
//               <Animated.View
//                 key={item.userID}
//                 style={[styles.cardStyle, androidStyle]}
//               >
//                 {renderCard(item)}
//               </Animated.View>
//             </Interactable.View>
//           );
//         })
//         .reverse();
//     }
//   }

//   renderBottomTabBar(containerStyle, buttonContainerStyle) {
//     const { isDone } = this.state;

//     return (
//       <View style={{ marginBottom: -8 }}>
//         <BottomTabBar
//           isDone={isDone}
//           // onRewindPressed={() => console.log('rewind pressed')}
//           onDislikePressed={() => this.onSwipeComplete("left")}
//           onSuperLikePressed={() => this.onSwipeComplete("superlike")}
//           onLikePressed={() => this.onSwipeComplete("right")}
//           // onBoostPressed={() => console.log('boost pressed')}
//           containerStyle={containerStyle}
//           buttonContainerStyle={buttonContainerStyle}
//         />
//       </View>
//     );
//   }

//   render() {
//     const { index } = this.state;
//     const { showMode, renderCardDetail, data, renderNewMatch } = this.props;

//     return (
//       <View style={styles.container}>
//         {this.renderCards()}
//         {showMode == 1 && data[index] && (
//           <Modal visible={this.state.isDialogVisible} animationType={"slide"}>
//             <View style={styles.cardDetailContainer}>
//               <View style={styles.cardDetailL}>
//                 {renderCardDetail(data[index], this.state.isdone)}
//               </View>
//             </View>
//           </Modal>
//         )}
//         {this.renderBottomTabBar()}
//         {showMode == 2 && (
//           <Modal
//             transparent={false}
//             visible={showMode == 2 ? true : false}
//             animationType={"slide"}
//           >
//             <View style={styles.newMatch}>{renderNewMatch()}</View>
//           </Modal>
//         )}
//       </View>
//     );
//   }
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: "flex-end"
//   },
//   cardStyle: {
//     position: "absolute",
//     top: 0,
//     bottom: 50,
//     left: 0,
//     right: 0,
//     width: Statics.DEVICE_WIDTH
//   },
//   cardDetailContainer: {
//     flex: 1,
//     alignItems: "center",
//     justifyContent: "flex-end",
//     backgroundColor: "rgba(0,0,0,0.5)"
//   },
//   cardDetailL: {
//     // position: 'absolute',
//     // bottom: 0,
//     width: Statics.DEVICE_WIDTH,
//     height: Statics.DEVICE_HEIGHT * 0.95,
//     // paddingBottom: size(100),
//     backgroundColor: "white"
//   },
//   newMatch: {
//     // position: 'absolute',
//     // bottom: 0,
//     width: Statics.DEVICE_WIDTH,
//     height: Statics.DEVICE_HEIGHT,
//     backgroundColor: "white"
//   },
//   noMoreCards: {
//     position: "absolute",
//     top: 0,
//     bottom: 50,
//     left: 0,
//     right: 0,
//     width: Statics.DEVICE_WIDTH
//   }
// });
