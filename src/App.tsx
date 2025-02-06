import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from './store/authStore';
import Login from './components/Login';
import DashboardScreen from './screens/DashboardScreen';
import ClassroomScreen from './screens/ClassroomScreen';

type RootStackParamList = {
  Dashboard: undefined;
  Classroom: { id: string };
  Login: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function App() {
  const { user, checkAuthStatus } = useAuthStore();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  return (
    <PaperProvider>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator>
            {!user ? (
              <Stack.Screen 
                name="Login" 
                component={Login}
                options={{ headerShown: false }}
              />
            ) : (
              <>
                <Stack.Screen 
                  name="Dashboard" 
                  component={DashboardScreen}
                  options={{ 
                    title: 'Dashboard',
                    headerBackVisible: false 
                  }}
                />
                <Stack.Screen 
                  name="Classroom" 
                  component={ClassroomScreen}
                  options={{ 
                    title: 'Classroom',
                    headerBackTitle: 'Back'
                  }}
                />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </PaperProvider>
  );
}

export default App;