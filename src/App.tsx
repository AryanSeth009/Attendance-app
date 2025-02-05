import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Classroom from './pages/Classroom';

const Stack = createNativeStackNavigator();

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
              // Auth stack
              <Stack.Screen 
                name="Login" 
                component={Login}
                options={{ headerShown: false }}
              />
            ) : (
              // App stack
              <>
                <Stack.Screen 
                  name="Dashboard" 
                  component={Dashboard}
                  options={{ 
                    title: 'Dashboard',
                    headerBackVisible: false 
                  }}
                />
                <Stack.Screen 
                  name="Classroom" 
                  component={Classroom}
                  options={{ title: 'Classroom' }}
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