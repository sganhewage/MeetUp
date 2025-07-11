import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "../screens/LoginScreen";
import NotesDashboardScreen from "../screens/NotesDashboardScreen";
import InsideNoteScreen from "../screens/InsideNoteScreen";
import CreateNoteScreen from "../screens/CreateNoteScreen";
import CalendarDashboardScreen from "../screens/CalendarDashboardScreen";

const Stack = createNativeStackNavigator();

const Navigation = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        id={undefined}
        initialRouteName="CalendarDashboardScreen"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="LoginScreen" component={LoginScreen} />
        <Stack.Screen name="CalendarDashboardScreen" component={CalendarDashboardScreen} />
        {/* NotesDashboardScreen and related note screens can be removed in the future */}
        {/* <Stack.Screen name="NotesDashboardScreen" component={NotesDashboardScreen} /> */}
        {/* <Stack.Screen name="InsideNoteScreen" component={InsideNoteScreen} /> */}
        {/* <Stack.Screen name="CreateNoteScreen" component={CreateNoteScreen} /> */}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default Navigation;
