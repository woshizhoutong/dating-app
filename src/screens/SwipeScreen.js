import React, { Component, Fragment } from "react";
import {
  AsyncStorage,
  StyleSheet,
  View,
  Alert,
  StatusBar,
  SafeAreaView,
  Platform,
  AppState,
  PermissionsAndroid // eslint-disable-line react-native/split-platform-components
} from "react-native";
import PropTypes from "prop-types";
import Geolocation from "@react-native-community/geolocation";
import ActivityModal from "../components/ActivityModal";
import CustomTabBar from "../components/custom_tab_bar";
import Deck from "../components/swipe/deck";
import TinderCard from "../components/swipe/tinder_card";
import NoMoreCard from "../components/swipe/no_more_card";
import CardDetail from "../components/swipe/cardDetail";
import NewMatch from "../components/swipe/newMatch";
import AppStyles from "../AppStyles";
import firebase from "react-native-firebase";
import { connect } from "react-redux";

class SwipeScreen extends Component {
  static propTypes = {
    user: PropTypes.object,
    navigation: PropTypes.object,
    appSettings: PropTypes.object
  };

  static navigationOptions = {
    header: null
  };

  constructor(props) {
    super(props);
    this.state = {
      detail: false,
      swipedUsers: [],
      recommendations: [],
      tabs: [
        AppStyles.iconSet.User,
        AppStyles.iconSet.fireIcon,
        AppStyles.iconSet.Message
      ],
      showMode: 0,
      iSwipedFriends: [],
      heSwipedFriends: [],
      friendShips: [],
      friends: [],
      newMatches: [],
      currentMatchData: {},
      alertCount: 0,
      loadedDeck: null,
      notifieldMatches: [],
      appState: AppState.currentState
    };

    this.didFocusSubscription = props.navigation.addListener(
      "didFocus",
      payload => this.handleComponentDidFocus()
    );

    this.deckRef = c => {
      this.deck = c;
    };

    this.handleIncompleteUserData();

    this.lastVisibleRecommendation = null;
    this.recommendationBatchLimit = 75;
    this.swipeThreshold = 4;

    this.positionWatchID = null;

    this.usersRef = firebase.firestore().collection("users");
    this.appSettingsRef = this.usersRef
      .doc(this.props.user.id)
      .collection("settings");
    this.userRef = this.usersRef.doc(this.props.user.id);
    this.swipeRef = firebase.firestore().collection("swipes");

    this.iSwipedRef = this.swipeRef
      .where("author", "==", this.props.user.userID)
      .where("type", "==", "like");
    this.heSwipedRef = this.swipeRef
      .where("swipedProfile", "==", this.props.user.userID)
      .where("type", "==", "like");
    this.recommendationRef = this.usersRef
      .orderBy("created_at", "desc")
      .limit(this.recommendationBatchLimit);
    StatusBar.setHidden(false);

    this.userSettingsDidChange = false;
  }

  componentDidMount() {
    console.log(
      "this.state.isProfileComplete",
      this.props.appSettings.isProfileComplete
    );
    AppState.addEventListener("change", this.handleAppStateChange);

    if (this.props.appSettings.isProfileComplete) {
      this.handleUserSwipeCollection();
      this.appSettingsUnsubscribe = this.appSettingsRef.onSnapshot(
        this.initializedAppsettings
      );
      this.iSwipedUnsubscribe = this.iSwipedRef.onSnapshot(
        this.onISwipeCollectionUpdate
      );
      this.heSwipedUnsubscribe = this.heSwipedRef.onSnapshot(
        this.onHeSwipeCollectionUpdate
      );
    }

    this.watchPositionChange();
  }

  componentDidUpdate(prevProps) {
    this.lastScreen = this.props.navigation.getParam("lastScreen");

    if (this.lastScreen) {
      this.props.navigation.setParams({ lastScreen: "" });
    }

    if (
      prevProps.appSettings.selectedDistanceIndex !==
      this.props.appSettings.selectedDistanceIndex
    ) {
      this.userSettingsDidChange = true;
    }

    StatusBar.setHidden(false);
  }

  componentWillUnmount() {
    this.didFocusSubscription && this.didFocusSubscription.remove();
    AppState.removeEventListener("change", this.handleAppStateChange);
    this.positionWatchID != null &&
      Geolocation.clearWatch(this.positionWatchID);
    //   if (this.heSwipedUnsubscribe) this.heSwipedUnsubscribe();
    //   if (this.iSwipedUnsubscribe) this.iSwipedUnsubscribe();
    //   if (this.usersUnsubscribe) this.usersUnsubscribe();
    //   if (this.userUnsubscribe) this.userUnsubscribe();
    //   if (this.appSettingsUnsubscribe) this.appSettingsUnsubscribe();
  }

  handleAppStateChange = nextAppState => {
    if (
      this.state.appState.match(/inactive|background/) &&
      nextAppState === "active"
    ) {
      this.userRef
        .update({
          active: true
        })
        .then(() => {
          this.updateAppUserData();
        })
        .then(() => {
          this.setState({ appState: nextAppState });
        })
        .catch(error => {
          console.log(error);
        });
    } else {
      this.userRef
        .update({
          active: false
        })
        .then(() => {
          this.updateAppUserData();
        })
        .then(() => {
          this.setState({ appState: nextAppState });
        })
        .catch(error => {
          console.log(error);
        });
    }
  };

  watchPositionChange = async () => {
    if (Platform.OS === "ios") {
      this.positionWatchID = this.watchPosition();
    } else {
      this.handleAndroidLocationPermission();
    }
  };

  handleAndroidLocationPermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: "Instadating App",
          message: "Instadating App wants to access your location "
        }
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        this.positionWatchID = this.watchPosition();
      } else {
        console.log("location permission denied");
        alert("Location permission denied");
      }
    } catch (err) {
      console.warn(err);
    }
  };

  watchPosition = () => {
    const self = this;

    return Geolocation.watchPosition(position => {
      console.log("position changed", position);

      self.userRef
        .update({
          position: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }
        })
        .then(() => {
          self.updateAppUserData();
        })
        .catch(error => {
          console.log(error);
        });
    });
  };

  handleComponentDidFocus = () => {
    if (this.userSettingsDidChange) {
      this.userSettingsDidChange = false;
      this.setState(
        {
          recommendations: []
        },
        () => {
          this.lastVisibleRecommendation = null;
          this.recommendationRef = this.usersRef
            .orderBy("created_at", "desc")
            .limit(this.recommendationBatchLimit);
          this.getMoreRecommendations();
        }
      );
    }
  };

  handleIncompleteUserData = () => {
    if (!this.props.user || !this.props.user.userID || !this.props.user.id) {
      this.props.navigation.dispatch({ type: "Logout" });
      alert("You've been logged out due to an error. Please log back in.");
    }

    this.updateAppUserData();

    console.log("this.props.user", this.props.user);

    if (!this.props.appSettings.isProfileComplete) {
      Alert.alert(
        "Let's complete your dating profile",
        "Welcome to instadating. Let's complete your dating profile to allow other people to express interest in you.",
        [
          {
            text: "Let's go",
            onPress: () => {
              this.props.appSettings.isProfilePicture
                ? this.props.navigation.replace("Profile", {
                    lastScreen: "Swipe"
                  })
                : this.props.navigation.replace("Addprofile");
            }
          }
        ],
        { cancelable: false }
      );
    }
  };

  handleUserSwipeCollection = () => {
    const self = this;
    const data = [];

    this.setState({ loadedDeck: false });

    self.swipeRef
      .where("author", "==", self.props.user.userID)
      .get()
      .then(function(swipes) {
        swipes.forEach(async swipe => {
          data.push(swipe.data().swipedProfile);
        });

        //this is the list of people i swiped for as a user
        self.setState({ swipedUsers: data }, () => {
          self.getMoreRecommendations();
        });

        // self.usersUnsubscribe = self.usersRef.onSnapshot(
        //   self.updateRecommendations
        // );
      });
  };

  handleNewMatchButtonTap = value => {
    this.setState({ showMode: 0 }, () => {
      setTimeout(() => {
        this.structureNewMatchAlert();
      }, 500);
      this.props.navigation.navigate(value);
    });
  };

  initializedAppsettings = querySnapshot => {
    const data = [];

    querySnapshot.forEach(doc => {
      const temp = doc.data();

      if (temp.type) {
        temp.id = doc.id;
        data.push(temp);
        this.props.navigation.dispatch({ type: temp.type, value: temp.value });
      }
    });
  };

  onISwipeCollectionUpdate = querySnapshot => {
    const data = [];

    querySnapshot.forEach(doc => {
      const temp = doc.data();

      temp.id = doc.id;
      data.push(temp);
    });

    this.setState({
      iSwipedFriends: data
    });

    // if (this.usersUnsubscribe)
    //     this.usersUnsubscribe();

    this.usersUnsubscribe = this.usersRef.onSnapshot(
      this.onUsersCollectionUpdate
    );
  };

  onHeSwipeCollectionUpdate = querySnapshot => {
    const data = [];

    querySnapshot.forEach(doc => {
      const temp = doc.data();

      temp.id = doc.id;
      data.push(temp);
    });

    this.setState({
      heSwipedFriends: data
    });

    // if (this.usersUnsubscribe)
    //     this.usersUnsubscribe();

    this.usersUnsubscribe = this.usersRef.onSnapshot(
      this.onUsersCollectionUpdate
    );
  };

  onUsersCollectionUpdate = querySnapshot => {
    const iSwipeData = [];
    const heSwipeData = [];

    querySnapshot.forEach(doc => {
      const user = doc.data();

      user.id = doc.id;

      // i swipe for he
      const friendships_1 = this.state.iSwipedFriends.filter(friend => {
        return friend.swipedProfile == user.id;
      });

      // he swipe for i
      const friendships_2 = this.state.heSwipedFriends.filter(friend => {
        return friend.author == user.id;
      });

      if (friendships_1.length > 0) {
        user.friendshipId = friendships_1[0].id;
        iSwipeData.push(user);
      }

      if (friendships_2.length > 0) {
        user.friendshipId = friendships_2[0].id;
        heSwipeData.push(user);
      }
    });

    const matchArray = this.getMatchUsers(heSwipeData, iSwipeData);

    this.setState({
      friends: matchArray
    });

    this.updateUserCollection(matchArray);

    // if (this.usersUnsubscribe)
    //     this.usersUnsubscribe();

    // this.userUnsubscribe = this.userRef.onSnapshot(this.updateUserCollection);
  };

  getMatchUsers = (heSwipeData, iSwipeData) => {
    const matchArray = [];

    heSwipeData.map(heUser => {
      iSwipeData.map(iUser => {
        if (iUser.id == heUser.id && iUser.id != this.props.user.userID) {
          matchArray.push(iUser.id);
        }
      });
    });

    console.log("iSwipeData", iSwipeData);
    console.log("heSwipeData", heSwipeData);
    console.log("matchArray", matchArray);

    return matchArray;
  };

  updateUserCollection = friends => {
    const oldfriends =
      this.props.user && this.props.user.friends ? this.props.user.friends : [];

    const newMatches = this.getNewMatches(oldfriends, friends);

    if (newMatches.length > 0 && this.state.newMatches.length === 0) {
      this.setState(
        {
          newMatches
        },
        () => this.updateUserFriendsCollection(friends, newMatches)
      );
    }

    console.log("newMatches in Update", newMatches);
  };

  getNewMatches = (oldfriends, friends) => {
    const newMatches = [];

    if (friends.length > 0) {
      friends.map(newFriend => {
        const isNewFriend = oldfriends && oldfriends.includes(newFriend);

        if (!isNewFriend) {
          newMatches.push(newFriend);
        }
      });
    }

    return newMatches;
  };

  updateUserFriendsCollection = (friends, newMatches) => {
    const self = this;

    self.userRef
      .update({
        friends
      })
      .then(() => {
        self.structureNewMatchAlert();
      })
      .then(() => {
        self.updateAppUserData();
        self.updateFriendshipsCollection(newMatches);
      })
      .catch(function(error) {
        console.log(error);
      });

    // if (this.userUnsubscribe) this.userUnsubscribe();
  };

  updateAppUserData = () => {
    const self = this;

    self.getGivenUserData(self.props.user.id, user => {
      self.props.navigation.dispatch({ type: "UPDATE_USER_DATA", user });
      AsyncStorage.setItem("@loggedInData:value", JSON.stringify(user));
    });
  };

  structureNewMatchAlert = async () => {
    const self = this;

    const { newMatches, notifieldMatches } = self.state;
    const spliceIndex = 0;
    const newUserMatchId = newMatches[spliceIndex];
    const newMatchesCopy = [...newMatches];

    const isPrevioulsyNofified = notifieldMatches.includes(newUserMatchId);

    if (!isPrevioulsyNofified && newUserMatchId) {
      self.getGivenUserData(newUserMatchId, currentMatchData => {
        newMatchesCopy.splice(spliceIndex, 1);

        self.setState(
          prevState => ({
            currentMatchData,
            notifieldMatches: [...prevState.notifieldMatches, newUserMatchId],
            newMatches: newMatchesCopy
          }),
          () => {
            self.setState({
              showMode: 2
            });
          }
        );
      });
    }
  };

  filterUsersForRecommendation = async (
    doc,
    { myPosition, swipedUsers, genderPre }
  ) => {
    const self = this;
    const appDistance = self.props.appSettings.maximumDistance.split(" ");
    const distanceValue = Number(appDistance[0]);
    // const distanceValue = Number(appDistance[0]) * 1000;
    const user = doc.data();
    const userRef = doc.ref;
    const userSettingsRef = userRef.collection("settings");

    user.id = doc.id;
    const {
      firstName,
      lastName,
      age,
      email,
      profilePictureURL,
      gender,
      position,
      userID
    } = user;
    const isNotUser = userID != this.props.user.userID;
    const hasPreviouslyNotBeenSwiped = swipedUsers.indexOf(userID) == -1;
    const isUserGenderInterest =
      genderPre == "Both" ? true : gender == genderPre;
    const isProfileComplete = this.props.appSettings.isProfileComplete;

    const querySnapshot = await userSettingsRef.get();
    let shouldShowMe = true;
    const userSettings = querySnapshot._docs.map(doc => {
      return doc._data;
    });
    const showMe = userSettings.find(setting => {
      return setting.type === "SHOW_ME";
    });

    if (showMe) {
      shouldShowMe = showMe.value;
    }

    if (
      firstName &&
      lastName &&
      age &&
      email &&
      profilePictureURL &&
      gender &&
      position &&
      isNotUser &&
      hasPreviouslyNotBeenSwiped &&
      isUserGenderInterest &&
      isProfileComplete &&
      shouldShowMe
    ) {
      user.distance = self.distance(
        position.latitude,
        position.longitude,
        myPosition.latitude,
        myPosition.longitude
      );

      if (user.distance <= distanceValue) {
        return user;
      }
    }
  };

  getGivenUserData = (id, callback) => {
    firebase
      .firestore()
      .collection("users")
      .doc(id)
      .get()
      .then(function(doc) {
        return doc.data();
      })
      .then(function(result) {
        callback(result);
      })
      .catch(function(error) {
        const { message } = error;

        console.log(message);
      });
  };

  distance(lat1, lon1, lat2, lon2, unit = "M") {
    if (lat1 == lat2 && lon1 == lon2) {
      return 0;
    } else {
      const radlat1 = (Math.PI * lat1) / 180;
      const radlat2 = (Math.PI * lat2) / 180;
      const theta = lon1 - lon2;
      const radtheta = (Math.PI * theta) / 180;
      let dist =
        Math.sin(radlat1) * Math.sin(radlat2) +
        Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);

      if (dist > 1) {
        dist = 1;
      }

      dist = Math.acos(dist);
      dist = (dist * 180) / Math.PI;
      dist = dist * 60 * 1.1515;

      if (unit == "K") {
        dist = dist * 1.609344;
      }

      if (unit == "N") {
        dist = dist * 0.8684;
      }

      return dist;
    }
  }

  getMoreRecommendations = async () => {
    this.setState({
      loadedDeck: false
    });

    try {
      const documentSnapshots = await this.recommendationRef.get();

      if (documentSnapshots.docs.length > 0) {
        // Get the last visible recommendation document
        this.lastVisibleRecommendation =
          documentSnapshots.docs[documentSnapshots.docs.length - 1];

        this.updateRecommendations(documentSnapshots);

        // Construct a new query starting at this document,
        this.recommendationRef = this.usersRef
          .orderBy("created_at", "desc")
          .startAfter(this.lastVisibleRecommendation)
          .limit(this.recommendationBatchLimit);
      } else {
        this.setState(prevState => ({
          loadedDeck: true,
          recommendations: [...prevState.recommendations, ...[]]
        }));
      }
    } catch (error) {
      console.log(error);
    }
  };

  updateRecommendations = async documentSnapshots => {
    const self = this;
    // let recommendations = [];
    const myPosition = this.props.user.position;
    const swipedUsers = this.state.swipedUsers;
    let genderPre = this.props.user.genderPre;

    if (!genderPre) genderPre = "Both";
    if (!myPosition) return;

    console.log("documentSnapshots==", documentSnapshots);

    try {
      const recommendationPromises = documentSnapshots._docs.map(async doc => {
        const recommendation = await self.filterUsersForRecommendation(doc, {
          myPosition,
          swipedUsers,
          genderPre
        });

        if (recommendation) {
          return recommendation;
        }
      });

      const recommendations = await Promise.all(recommendationPromises);

      const cleanedRecommendations = recommendations.filter(recommendation => {
        if (recommendation) {
          return recommendation;
        }
      });

      console.log("now cleanedRecommendations", cleanedRecommendations);

      if (cleanedRecommendations.length > 0) {
        this.setState(prevState => ({
          recommendations: [
            ...prevState.recommendations,
            ...cleanedRecommendations
          ],
          loadedDeck: true
        }));
      } else {
        this.getMoreRecommendations();
      }
    } catch (error) {
      console.log(error);
    }

    if (this.usersUnsubscribe) this.usersUnsubscribe();
  };

  setShowMode(mode) {
    this.setState({ showMode: mode });
  }

  onSwipe(type, item, index) {
    const self = this;
    const data = {
      author: this.props.user.userID,
      swipedProfile: item.userID,
      type
    };
    // const shouldFetchRecommendations =
    //   Math.abs(index - this.state.recommendations.length) < this.swipeThreshold;
    const shouldFetchRecommendations =
      this.state.recommendations.length < this.swipeThreshold;
    const recommendationsCopy = [...this.state.recommendations];

    recommendationsCopy.splice(index, 1);

    this.setState({ recommendations: recommendationsCopy }, () => {
      if (shouldFetchRecommendations) {
        this.getMoreRecommendations();
      }

      this.swipeRef.add(data).then(() => {
        const swipedUsers = self.state.swipedUsers;

        swipedUsers.push(item.userID);
        self.setState({ swipedUsers });
      });
    });
  }

  updateFriendshipsCollection = newMatches => {
    if (newMatches.length > 0) {
      newMatches.map(friendId => {
        const data = {
          user1: friendId,
          user2: this.props.user.id
        };

        firebase
          .firestore()
          .collection("friendships")
          .add(data)
          .then(() => {
            console.log("match successfully saved to friendships collection");
          })
          .catch(function(error) {
            alert(error);
          });
      });
    }
  };

  renderCard(item) {
    return (
      <TinderCard
        key={"TinderCard" + item.userID}
        url={item.profilePictureURL}
        name={item.firstName}
        age={item.age}
        school={item.school}
        distance={item.distance}
        setShowMode={this.setShowMode.bind(this)}
      />
    );
  }

  renderCardDetail(item, isDone) {
    return (
      <CardDetail
        key={"CardDetail" + item.userID}
        profilePictureURL={item.profilePictureURL}
        firstName={item.firstName}
        age={item.age}
        school={item.school}
        distance={item.distance}
        bio={item.bio}
        instagramPhotos={item.photos ? item.photos : []}
        setShowMode={this.setShowMode.bind(this)}
        onSwipe={direction => this.deck.onSwipeFromCardDetail(direction)}
        isDone={isDone}
        bottomTabBar={true}
      />
    );
  }

  renderEmptyState() {
    return (
      <NoMoreCard
        profilePictureURL={this.props.user.profilePictureURL}
        isProfileComplete={this.props.appSettings.isProfileComplete}
      />
    );
  }

  renderNewMatch() {
    return (
      <NewMatch
        url={this.state.currentMatchData.profilePictureURL}
        onSendMessage={() => this.handleNewMatchButtonTap("Home")}
        onKeepSwiping={this.handleNewMatchButtonTap}
      />
    );
  }

  // detail() {
  //   this.setState({detail: true});
  // }

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
  render() {
    return (
      <Fragment>
        <StatusBar
          hidden={false}
          backgroundColor={Platform.OS == "ios" ? "white" : "black"}
          barStyle={Platform.OS == "ios" ? "dark-content" : "light-content"}
        />
        <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
          <View style={styles.container}>
            <CustomTabBar
              id={1}
              tabs={this.state.tabs}
              goToPage={this.goToPage.bind(this)}
            />
            {(this.state.loadedDeck ||
              this.state.recommendations.length > 0) && (
              <Deck
                ref={this.deckRef}
                data={this.state.recommendations}
                renderCard={this.renderCard.bind(this)}
                renderCardDetail={this.renderCardDetail.bind(this)}
                renderNoMoreCards={this.renderEmptyState.bind(this)}
                renderNewMatch={this.renderNewMatch.bind(this)}
                onSwipeLeft={(item, index) =>
                  this.onSwipe("dislike", item, index)
                }
                onSwipeRight={(item, index) =>
                  this.onSwipe("like", item, index)
                }
                showMode={this.state.showMode}
              />
            )}
            <ActivityModal
              loading={
                this.state.loadedDeck === false &&
                this.state.recommendations.length === 0
              }
              title={"Please wait"}
              size={"large"}
              activityColor={"white"}
              titleColor={"white"}
              activityWrapperStyle={{
                backgroundColor: "#404040"
              }}
            />
          </View>
        </SafeAreaView>
        <SafeAreaView
          style={{ flex: 0, backgroundColor: "rgb(244,246,251)" }}
        />
      </Fragment>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgb(244,246,251)",
    height: "100%"
    // justifyContent: 'center',
  }
});

const mapStateToProps = state => ({
  appSettings: state.appSettings,
  user: state.auth.user
});

//'https://pbs.twimg.com/profile_images/681369932207013888/CHESpTzF.jpg'

export default connect(mapStateToProps)(SwipeScreen);
