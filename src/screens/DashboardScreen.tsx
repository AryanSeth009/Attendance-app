import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card, Text, Button, FAB, Portal, Dialog, TextInput } from 'react-native-paper';
import { useAuthStore } from '../store/authStore';
import * as SecureStore from 'expo-secure-store';

interface Classroom {
  id: string;
  name: string;
  description: string;
  joinCode: string;
}

const API_URL = 'http://10.0.2.2:3000/api'; // Update this to match your backend URL

export default function DashboardScreen({ navigation }) {
  const { user } = useAuthStore();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [newClassroom, setNewClassroom] = useState({ name: '', description: '' });
  const [error, setError] = useState('');

  const loadClassrooms = async () => {
    setIsLoading(true);
    try {
      const token = await SecureStore.getItemAsync('token');
      const response = await fetch(`${API_URL}/classrooms`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to load classrooms');
      const data = await response.json();
      setClassrooms(data);
    } catch (error) {
      console.error('Error loading classrooms:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClassrooms();
  }, []);

  const handleJoinClassroom = async () => {
    if (!joinCode.trim()) {
      setError('Please enter a join code');
      return;
    }

    try {
      const token = await SecureStore.getItemAsync('token');
      const response = await fetch(`${API_URL}/classrooms/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ joinCode })
      });

      if (!response.ok) throw new Error('Invalid join code');

      await loadClassrooms();
      setJoinCode('');
      setIsJoining(false);
    } catch (error) {
      setError('Failed to join classroom');
    }
  };

  const handleCreateClassroom = async () => {
    if (!newClassroom.name.trim()) {
      setError('Please enter a classroom name');
      return;
    }

    try {
      const token = await SecureStore.getItemAsync('token');
      const response = await fetch(`${API_URL}/classrooms`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newClassroom)
      });

      if (!response.ok) throw new Error('Failed to create classroom');

      await loadClassrooms();
      setNewClassroom({ name: '', description: '' });
      setIsCreating(false);
    } catch (error) {
      setError('Failed to create classroom');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadClassrooms} />
        }
      >
        {classrooms.map((classroom) => (
          <Card
            key={classroom.id}
            style={styles.card}
            onPress={() => navigation.navigate('Classroom', { 
              id: classroom.id,
              name: classroom.name 
            })}
          >
            <Card.Content>
              <Text variant="titleLarge">{classroom.name}</Text>
              <Text variant="bodyMedium">{classroom.description}</Text>
              <Text variant="bodySmall" style={styles.code}>
                Code: {classroom.joinCode}
              </Text>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>

      {user?.role === 'admin' ? (
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={() => setIsCreating(true)}
        />
      ) : (
        <FAB
          icon="account-multiple-plus"
          style={styles.fab}
          onPress={() => setIsJoining(true)}
        />
      )}

      <Portal>
        <Dialog visible={isJoining} onDismiss={() => setIsJoining(false)}>
          <Dialog.Title>Join Classroom</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Class Code"
              value={joinCode}
              onChangeText={setJoinCode}
              mode="outlined"
            />
            {error && <Text style={styles.error}>{error}</Text>}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setIsJoining(false)}>Cancel</Button>
            <Button onPress={handleJoinClassroom}>Join</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={isCreating} onDismiss={() => setIsCreating(false)}>
          <Dialog.Title>Create Classroom</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Class Name"
              value={newClassroom.name}
              onChangeText={(text) => setNewClassroom(prev => ({ ...prev, name: text }))}
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="Description"
              value={newClassroom.description}
              onChangeText={(text) => setNewClassroom(prev => ({ ...prev, description: text }))}
              mode="outlined"
              multiline
              numberOfLines={3}
            />
            {error && <Text style={styles.error}>{error}</Text>}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setIsCreating(false)}>Cancel</Button>
            <Button onPress={handleCreateClassroom}>Create</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    margin: 8,
  },
  code: {
    marginTop: 8,
    color: '#666',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  input: {
    marginBottom: 16,
  },
  error: {
    color: 'red',
    marginTop: 8,
  },
});