import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card, Text, Button, Chip, Surface } from 'react-native-paper';
import { useAuthStore } from '../store/authStore';
import * as SecureStore from 'expo-secure-store';

interface AttendanceRecord {
  id: string;
  status: 'present' | 'absent' | 'late';
  createdAt: string;
  student: {
    email: string;
  };
}

const API_URL = 'http://10.0.2.2:3000/api'; // Update this to match your backend URL

export default function ClassroomScreen({ route }) {
  const { id } = route.params;
  const [classroom, setClassroom] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [isMarking, setIsMarking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuthStore();

  const loadData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([loadClassroom(), loadAttendanceRecords()]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadClassroom = async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      const response = await fetch(`${API_URL}/classrooms/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to load classroom');
      const data = await response.json();
      setClassroom(data);
    } catch (error) {
      console.error('Error loading classroom:', error);
    }
  };

  const loadAttendanceRecords = async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      const response = await fetch(`${API_URL}/attendance/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to load attendance records');
      const data = await response.json();
      setAttendanceRecords(data);
    } catch (error) {
      console.error('Error loading attendance records:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const markAttendance = async () => {
    setIsMarking(true);
    try {
      const token = await SecureStore.getItemAsync('token');
      const response = await fetch(`${API_URL}/attendance/${id}/mark`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'present' })
      });
      
      if (!response.ok) throw new Error('Failed to mark attendance');
      
      await loadAttendanceRecords();
    } catch (error) {
      console.error('Error marking attendance:', error);
    } finally {
      setIsMarking(false);
    }
  };

  if (!classroom) {
    return (
      <View style={styles.loading}>
        <Text>Loading classroom...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadData} />
        }
      >
        <Surface style={styles.infoCard} elevation={1}>
          <Text variant="titleLarge">{classroom.name}</Text>
          <Text variant="bodyMedium" style={styles.description}>
            {classroom.description}
          </Text>
        </Surface>

        {user?.role === 'student' && (
          <Button
            mode="contained"
            onPress={markAttendance}
            loading={isMarking}
            disabled={isMarking}
            style={styles.markButton}
          >
            Mark Present
          </Button>
        )}

        <Text variant="titleMedium" style={styles.sectionTitle}>
          Recent Attendance
        </Text>

        {attendanceRecords.map((record) => (
          <Card key={record.id} style={styles.attendanceCard}>
            <Card.Content>
              <Text variant="titleMedium">{record.student.email}</Text>
              <View style={styles.recordDetails}>
                <Chip
                  mode="flat"
                  style={[
                    styles.statusChip,
                    record.status === 'present'
                      ? styles.presentChip
                      : record.status === 'late'
                      ? styles.lateChip
                      : styles.absentChip
                  ]}
                >
                  {record.status}
                </Chip>
                <Text variant="bodySmall">
                  {new Date(record.createdAt).toLocaleString()}
                </Text>
              </View>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCard: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
  },
  description: {
    marginTop: 8,
    color: '#666',
  },
  markButton: {
    margin: 16,
  },
  sectionTitle: {
    margin: 16,
    marginBottom: 8,
  },
  attendanceCard: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  recordDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statusChip: {
    marginRight: 8,
  },
  presentChip: {
    backgroundColor: '#e6ffe6',
  },
  lateChip: {
    backgroundColor: '#fff3e6',
  },
  absentChip: {
    backgroundColor: '#ffe6e6',
  },
});