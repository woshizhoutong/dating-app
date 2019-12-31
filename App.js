import React from "react";
import { AppRegistry, YellowBox } from "react-native";
import { name as appName } from "./app.json";
import { Provider } from "react-redux";
import { createStore, applyMiddleware } from "redux";

import AppReducer from "./src/reducers";
import { AppNavigator, middleware } from "./src/navigations/AppNavigation";
import SplashScreen from "react-native-splash-screen";

const store = createStore(AppReducer, applyMiddleware(middleware));

class App extends React.Component {
  constructor() {
    super();
    YellowBox.ignoreWarnings(["Remote Debugger"]);
    console.disableYellowBox = true;
  }

  componentDidMount() {
    SplashScreen.hide();
  }

  render() {
    return (
      <Provider store={store}>
        <AppNavigator />
      </Provider>
    );
  }
}

AppRegistry.registerComponent(appName, () => App);

export default App;
