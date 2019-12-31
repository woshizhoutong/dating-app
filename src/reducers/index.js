import { NavigationActions, StackActions } from "react-navigation";
import { AsyncStorage } from "react-native";
import { combineReducers } from "redux";
import { RootNavigator } from "../navigations/AppNavigation";
import firebase from "react-native-firebase";

const distanceData = ["5 miles", "10 miles", "20 miles", "50 miles"];
const genderData = ["Male", "Female", "Don't show"];

// Start with two routes: The Main screen, with the Login screen on top.

const firstAction = RootNavigator.router.getActionForPathAndParams(
  "LoadScreen"
);
const initialNavState = RootNavigator.router.getStateForAction(firstAction);

function nav(state = initialNavState, action) {
  let nextState;

  switch (action.type) {
    case "Login":
      nextState = RootNavigator.router.getStateForAction(
        NavigationActions.navigate({ routeName: "DrawerStack" }),
        state
      );
      break;
    case "Logout":
      try {
        StackActions.reset({
          index: 0
        });
        AsyncStorage.removeItem("@loggedInData:value");
        firebase.auth().signOut();
        nextState = RootNavigator.router.getStateForAction(
          StackActions.reset({
            index: 0,
            actions: [NavigationActions.navigate({ routeName: "LoginStack" })]
          }),
          state
        );
      } catch (e) {
        console.log(e);
      }

      break;
    default:
      nextState = RootNavigator.router.getStateForAction(action, state);
      break;
  }

  // Simply return the original `state` if `nextState` is null or undefined.
  return nextState || state;
}

const initialAuthState = { isLoggedIn: false };

function auth(state = initialAuthState, action) {
  switch (action.type) {
    case "Login":
      return {
        ...state,
        isLoggedIn: true
      };

    case "UPDATE_USER_DATA":
      return {
        ...state,
        isLoggedIn: true,
        user: { ...state.user, ...action.user }
      };
    case "Logout":
      AsyncStorage.removeItem("@loggedInData:value");
      firebase
        .firestore()
        .collection("users")
        .doc(state.user.userID)
        .update({ active: false });

      return { ...state, isLoggedIn: false };
    default:
      return state;
  }
}

const initialSettingsState = {
  distanceData,
  genderData,
  selectedDistanceIndex: distanceData.length - 1,
  selectedGenderIndex: 2,
  gender: genderData[2],
  maximumDistance: distanceData[distanceData.length - 1],
  newMatches: true,
  messages: true,
  superLike: true,
  topPicks: true,
  showMe: true,
  isFromSignup: false,
  isProfileComplete: false,
  isProfilePicture: false
};

function appSettings(state = initialSettingsState, action) {
  switch (action.type) {
    case "SHOW_ME":
      return Object.assign({}, state, {
        showMe: action.value
      });
    case "NEW_MATCHES":
      return Object.assign({}, state, {
        newMatches: action.value
      });
    case "MESSAGES":
      return Object.assign({}, state, {
        messages: action.value
      });
    case "SUPER_LIKE":
      return Object.assign({}, state, {
        superLike: action.value
      });
    case "TOP_PICKS":
      return Object.assign({}, state, {
        topPicks: action.value
      });
    case "GENDER":
      return Object.assign({}, state, {
        selectedGenderIndex: action.value,
        gender: action.value.gender
          ? action.value.gender
          : genderData[action.value]
      });
    case "MAXIMUM_DISTANCE":
      return Object.assign({}, state, {
        selectedDistanceIndex: action.value,
        maximumDistance: action.value.maximumDistance
          ? action.value.maximumDistance
          : distanceData[action.value]
      });
    case "INITIALIZE_APP_SETTINGS":
      return Object.assign({}, state, {
        settings: action.value.settings
      });
    case "IS_FROM_SIGNUP":
      return Object.assign({}, state, {
        isFromSignup: action.value
      });
    case "IS_PROFILE_COMPLETE":
      return Object.assign({}, state, {
        isProfileComplete: action.value
      });
    case "IS_PROFILE_PICTURE":
      return Object.assign({}, state, {
        isProfilePicture: action.value
      });
    case "Logout":
      return {
        ...state,
        selectedDistanceIndex: 2,
        selectedGenderIndex: 2,
        gender: "",
        maximumDistance: "",
        newMatches: false,
        messages: false,
        superLike: false,
        topPicks: false,
        showMe: false,
        isFromSignup: false,
        isProfileComplete: false,
        isProfilePicture: false
      };
    default:
      return state;
  }
}

const AppReducer = combineReducers({
  nav,
  auth,
  appSettings
});

export default AppReducer;
