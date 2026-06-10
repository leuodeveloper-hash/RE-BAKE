import {Tabs} from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={() => null}
      screenOptions={{headerShown: false}}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="group" />
      <Tabs.Screen name="explore" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
