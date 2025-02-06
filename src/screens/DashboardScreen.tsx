import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Dialog, Portal, Button } from 'react-native-paper';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../store/authStore';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

// Get the development machine's IP address
const DEV_MACHINE_IP = '192.168.0.104'; // Make sure this matches your authStore.ts

const API_URL = Platform.select({
  web: "http://localhost:3000/api",
  android: __DEV__
    ? `http://${DEV_MACHINE_IP}:3000/api`
    : "http://your-production-api.com/api",
  ios: __DEV__
    ? `http://${DEV_MACHINE_IP}:3000/api`
    : "http://your-production-api.com/api",
  default: "http://localhost:3000/api",
});

interface Classroom {
  id: string;
  name: string;
  description: string;
  joinCode: string;
}

type RootStackParamList = {
  Dashboard: undefined;
  Classroom: { id: string };
  Login: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

const DashboardScreen = ({ navigation }: Props) => {
  const { user } = useAuthStore();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [isJoinModalVisible, setIsJoinModalVisible] = useState(false);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [newClassroom, setNewClassroom] = useState({ name: '', description: '' });

  const getToken = async () => {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem('token');
      }
      const token = await SecureStore.getItemAsync('token');
      return token;
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  };

  const loadClassrooms = async () => {
    try {
      const token = await getToken();
      console.log('Token exists:', !!token);
      if (!token) {
        Alert.alert('Error', 'No authentication token found');
        return;
      }

      const response = await fetch(`${API_URL}/classrooms`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load classrooms');
      }

      const data = await response.json();
      console.log('Received classrooms:', data);
      setClassrooms(data);
    } catch (error) {
      console.error('Load classrooms error:', error);
      Alert.alert('Error', 'Failed to load classrooms');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateClassroom = async () => {
    try {
      // 1. Debug user role
      console.log('Current user state:', user);
      if (!user || user.role !== 'admin') {
        console.error('Role check failed:', {
          userExists: !!user,
          userRole: user?.role
        });
        Alert.alert('Error', 'Only administrators can create classrooms');
        return;
      }

      // 2. Debug input validation
      console.log('New classroom data:', newClassroom);
      if (!newClassroom.name.trim()) {
        console.error('Validation failed: Empty classroom name');
        Alert.alert('Error', 'Please enter a classroom name');
        return;
      }

      // 3. Debug token
      const token = await getToken();
      console.log('Auth token exists:', !!token);
      if (!token) {
        console.error('No auth token found');
        Alert.alert('Error', 'Authentication token not found. Please login again.');
        return;
      }

      // 4. Debug API request
      const requestData = {
        name: newClassroom.name.trim(),
        description: newClassroom.description.trim()
      };

      const url = `${API_URL}/classrooms`;
      console.log('Making request to:', url);
      console.log('Request payload:', requestData);

      // 5. Make API call with detailed error logging
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      // 6. Debug response parsing
      const responseText = await response.text();
      console.log('Raw response:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
        console.log('Parsed response:', data);
      } catch (e) {
        console.error('Failed to parse response:', e);
        throw new Error(`Invalid server response: ${responseText}`);
      }

      if (!response.ok) {
        throw new Error(data.message || `Server returned ${response.status}: ${responseText}`);
      }

      // 7. Success handling
      setIsCreateModalVisible(false);
      setNewClassroom({ name: '', description: '' });
      await loadClassrooms();
      Alert.alert('Success', 'Classroom created successfully');

    } catch (error) {
      console.error('Create classroom error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to create classroom. Please try again.'
      );
    }
  };

  const handleCreatePress = () => {
    console.log('Create button pressed');
    handleCreateClassroom().catch(error => {
      console.error('Unhandled create classroom error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    });
  };

  const handleJoinClassroom = async () => {
    if (!joinCode.trim()) {
      Alert.alert('Error', 'Please enter a join code');
      return;
    }

    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/classrooms/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ joinCode })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to join classroom');
      }

      setIsJoinModalVisible(false);
      setJoinCode('');
      loadClassrooms();
      Alert.alert('Success', 'Successfully joined the classroom');
    } catch (error) {
      console.error('Join classroom error:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to join classroom');
    }
  };

  useEffect(() => {
    loadClassrooms();
  }, []);

  const renderClassroomItem = ({ item }: { item: Classroom }) => {
    console.log('Rendering classroom item:', item);
    return (
      <TouchableOpacity
        style={styles.classroomCard}
        onPress={() => {
          console.log('Navigating to classroom with id:', item._id); 
          navigation.navigate('Classroom', { id: item._id }); 
        }}
      >
        <Text style={styles.classroomName}>{item.name}</Text>
        {item.description ? (
          <Text style={styles.classroomDescription}>{item.description}</Text>
        ) : null}
        {user?.role === 'admin' ? (
          <Text style={styles.joinCode}>Join Code: {item.joinCode}</Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Classrooms</Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => setIsJoinModalVisible(true)}
          >
            <Text style={styles.buttonText}>Join</Text>
          </TouchableOpacity>
          {user?.role === 'admin' ? (
            <TouchableOpacity
              style={styles.button}
              onPress={() => setIsCreateModalVisible(true)}
            >
              <Text style={styles.buttonText}>Create</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <FlatList
        data={classrooms}
        renderItem={renderClassroomItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
      />

      <Portal>
        <Dialog
          visible={isCreateModalVisible}
          onDismiss={() => {
            setIsCreateModalVisible(false);
            setNewClassroom({ name: '', description: '' });
          }}
        >
          <Dialog.Title>Create Classroom</Dialog.Title>
          <Dialog.Content>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
              <TextInput
                style={styles.input}
                placeholder="Classroom name"
                value={newClassroom.name}
                onChangeText={(text) => setNewClassroom(prev => ({ ...prev, name: text }))}
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Description (optional)"
                value={newClassroom.description}
                onChangeText={(text) => setNewClassroom(prev => ({ ...prev, description: text }))}
                multiline
                numberOfLines={3}
              />
            </KeyboardAvoidingView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setIsCreateModalVisible(false);
                setNewClassroom({ name: '', description: '' });
              }}
            >
              Cancel
            </Button>
            <Button onPress={handleCreatePress}>Create</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={isJoinModalVisible}
          onDismiss={() => {
            setIsJoinModalVisible(false);
            setJoinCode('');
          }}
        >
          <Dialog.Title>Join Classroom</Dialog.Title>
          <Dialog.Content>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
              <TextInput
                style={styles.input}
                placeholder="Enter join code"
                value={joinCode}
                onChangeText={setJoinCode}
              />
            </KeyboardAvoidingView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setIsJoinModalVisible(false);
                setJoinCode('');
              }}
            >
              Cancel
            </Button>
            <Button onPress={handleJoinClassroom}>Join</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
  },
  button: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  classroomCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  classroomName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  classroomDescription: {
    color: '#666',
    marginBottom: 8,
  },
  joinCode: {
    color: '#6366f1',
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 4,
    padding: 12,
    marginBottom: 12,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
});

export default DashboardScreen;