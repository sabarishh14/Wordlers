import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ 
      tabBarActiveTintColor: '#6aaa64', // Official Wordle Green
      tabBarInactiveTintColor: '#a1a1aa', // Soft modern gray
      headerShown: false,
      tabBarStyle: {
        borderTopWidth: 1,
        borderTopColor: '#f4f4f5',
        elevation: 0, // Removes harsh Android shadow
        shadowOpacity: 0, // Removes harsh iOS shadow
        backgroundColor: '#ffffff'
      }
    }}>
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: 'Play',
          tabBarIcon: ({ color }) => <Ionicons name="game-controller-outline" size={24} color={color} />
        }} 
      />
      <Tabs.Screen 
        name="explore" 
        options={{ 
          title: 'Leaderboard',
          tabBarIcon: ({ color }) => <Ionicons name="trophy-outline" size={24} color={color} />
        }} 
      />
      <Tabs.Screen 
        name="profile" 
        options={{ 
          title: 'Profile',
          tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={24} color={color} />
        }} 
      />
    </Tabs>
  );
}