import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { useAuthStore } from './src/store/authStore';

import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ClassroomScreen from './src/screens/ClassroomScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const user = useAuthStore((state) => state.user);

  return (
    <PaperProvider>
      <NavigationContainer>
        <Stack.Navigator>
          {!user ? (
            <Stack.Screen 
              name="Login" 
              component={LoginScreen} 
              options={{ headerShown: false }}
            />
          ) : (
            <>
              <Stack.Screen 
                name="Dashboard" 
                component={DashboardScreen}
                options={{ title: 'My Classrooms' }}
              />
              <Stack.Screen 
                name="Classroom" 
                component={ClassroomScreen}
                options={({ route }) => ({ 
                  title: route.params?.name || 'Classroom'
                })}
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}