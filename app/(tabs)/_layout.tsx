import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useTheme } from '../../contexts/_ThemeContext';

export default function TabLayout() {
  const { isDark } = useTheme();

  // Dynamic colors for the tab bar
  const themeBg = isDark ? '#121212' : '#ffffff';
  const borderColor = isDark ? '#222222' : '#f4f4f5';
  const activeColor = isDark ? '#538d4e' : '#6aaa64'; // Slightly deeper green for dark mode contrast

  return (
    <Tabs screenOptions={{ 
      tabBarActiveTintColor: activeColor, 
      tabBarInactiveTintColor: '#a1a1aa', 
      headerShown: false,
      tabBarStyle: {
        borderTopWidth: 1,
        borderTopColor: borderColor,
        elevation: 0, 
        shadowOpacity: 0, 
        backgroundColor: themeBg
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