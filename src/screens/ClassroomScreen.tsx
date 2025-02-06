"use client"

import React, { useEffect, useState } from "react"
import { View, StyleSheet, ScrollView, RefreshControl, Alert, Platform, ActivityIndicator } from "react-native"
import { Card, Text, Button, Chip, Surface, IconButton, Avatar } from "react-native-paper"
import { useAuthStore, storage } from "../store/authStore"
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

// Get the development machine's IP address
const DEV_MACHINE_IP = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

const API_URL = Platform.select({
  web: "http://localhost:3000/api",
  android: __DEV__
    ? `http://${DEV_MACHINE_IP}:3000/api`
    : "http://your-production-api.com/api",
  ios: __DEV__
    ? "http://localhost:3000/api"
    : "http://your-production-api.com/api",
  default: "http://localhost:3000/api",
});

interface ClassroomData {
  _id: string
  name: string
  description: string
  createdBy: {
    email: string
  }
  joinCode: string
}

interface AttendanceRecord {
  _id: string;
  student: {
    email: string;
    studentId: string;
  };
  status: "present";
  markedAt: string;
}

interface AttendanceSession {
  _id: string;
  startTime: string;
  endTime?: string;
  status: "active" | "ended";
  createdBy: {
    email: string;
  };
  records: AttendanceRecord[];
}

type RootStackParamList = {
  Dashboard: undefined;
  Classroom: { id: string };
  Login: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'Classroom'>;

export default function ClassroomScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const [classroom, setClassroom] = useState<ClassroomData | null>(null);
  const [activeSession, setActiveSession] = useState<AttendanceSession | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("stream");
  const { user } = useAuthStore();

  const loadData = async () => {
    if (!id) {
      setError("No classroom ID provided");
      setIsLoading(false);
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      await Promise.all([
        loadClassroom(),
        loadActiveSession(),
        loadAttendanceHistory()
      ]);
    } catch (error) {
      console.error("Error loading data:", error);
      setError(error instanceof Error ? error.message : "Failed to load classroom data");
    } finally {
      setIsLoading(false);
    }
  };

  const loadClassroom = async () => {
    try {
      const token = await storage.getItem("token");
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const response = await fetch(`${API_URL}/classrooms/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const responseText = await response.text();
        if (response.status === 404) {
          throw new Error("Classroom not found");
        }
        throw new Error(`Failed to load classroom: ${responseText}`);
      }

      const data = await response.json();
      setClassroom(data);
    } catch (error) {
      console.error("Error loading classroom:", error);
      throw error;
    }
  };

  const loadActiveSession = async () => {
    try {
      const token = await storage.getItem("token");
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const response = await fetch(`${API_URL}/attendance/session/active/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load active session");
      }

      const data = await response.json();
      setActiveSession(data);
    } catch (error) {
      console.error("Error loading active session:", error);
      throw error;
    }
  };

  const loadAttendanceHistory = async () => {
    try {
      const token = await storage.getItem("token");
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const response = await fetch(`${API_URL}/attendance/session/records/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load attendance history");
      }

      const data = await response.json();
      setAttendanceHistory(data);
    } catch (error) {
      console.error("Error loading attendance history:", error);
      throw error;
    }
  };

  const startAttendance = async () => {
    try {
      const token = await storage.getItem("token");
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const response = await fetch(`${API_URL}/attendance/session/start/${id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      const session = await response.json();
      setActiveSession(session);
      Alert.alert("Success", "Attendance session started");
    } catch (error) {
      console.error("Error starting attendance:", error);
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to start attendance");
    }
  };

  const endAttendance = async () => {
    if (!activeSession) return;

    try {
      const token = await storage.getItem("token");
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const response = await fetch(`${API_URL}/attendance/session/${activeSession._id}/end`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      setActiveSession(null);
      await loadAttendanceHistory();
      Alert.alert("Success", "Attendance session ended");
    } catch (error) {
      console.error("Error ending attendance:", error);
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to end attendance");
    }
  };

  const markAttendance = async () => {
    if (!activeSession) {
      Alert.alert("Error", "No active attendance session");
      return;
    }

    try {
      const token = await storage.getItem("token");
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const response = await fetch(`${API_URL}/attendance/session/${activeSession._id}/mark`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      await loadActiveSession();
      Alert.alert("Success", "Attendance marked successfully");
    } catch (error) {
      console.error("Error marking attendance:", error);
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to mark attendance");
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  // Poll for updates to active session
  useEffect(() => {
    if (!activeSession) return;

    const interval = setInterval(() => {
      loadActiveSession();
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, [activeSession?._id]);

  if (error) {
    return (
      <View style={styles.loading}>
        <Text style={styles.errorText}>{error}</Text>
        <Button mode="contained" onPress={loadData} style={styles.retryButton}>
          Retry
        </Button>
      </View>
    );
  }

  if (isLoading || !classroom) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading classroom...</Text>
      </View>
    );
  }

  const renderAttendanceButton = () => {
    if (user?.role !== "admin") {
      if (!activeSession) {
        return null;
      }

      const hasMarked = activeSession.records.some(
        record => record.student.email === user?.email
      );

      return (
        <Button
          mode="contained"
          onPress={markAttendance}
          disabled={hasMarked}
          style={styles.actionButton}
        >
          {hasMarked ? "Attendance Marked" : "Mark Attendance"}
        </Button>
      );
    }

    if (activeSession) {
      return (
        <Button
          mode="contained"
          onPress={endAttendance}
          style={[styles.actionButton, { backgroundColor: "#ff6b6b" }]}
        >
          End Attendance
        </Button>
      );
    }

    return (
      <Button
        mode="contained"
        onPress={startAttendance}
        style={styles.actionButton}
      >
        Start Attendance
      </Button>
    );
  };

  const renderAttendanceStatus = () => {
    if (!activeSession) return null;

    return (
      <View style={styles.attendanceStatus}>
        <Text style={styles.statusTitle}>Active Attendance Session</Text>
        <Text style={styles.statusTime}>
          Started: {new Date(activeSession.startTime).toLocaleTimeString()}
        </Text>
        <Text style={styles.statusCount}>
          {activeSession.records.length} students marked present
        </Text>
        {user?.role === "admin" && (
          <View style={styles.presentStudents}>
            {activeSession.records.map(record => (
              <Chip key={record._id} style={styles.studentChip}>
                {record.student.email}
              </Chip>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderAttendanceHistory = () => {
    if (user?.role !== "admin" || attendanceHistory.length === 0) return null;

    return (
      <View style={styles.historySection}>
        <Text style={styles.historyTitle}>Attendance History</Text>
        {attendanceHistory.map(session => (
          <Card key={session._id} style={styles.historyCard}>
            <Card.Content>
              <Text style={styles.historyDate}>
                {new Date(session.startTime).toLocaleDateString()}
              </Text>
              <Text style={styles.historyTime}>
                {new Date(session.startTime).toLocaleTimeString()} - 
                {session.endTime ? new Date(session.endTime).toLocaleTimeString() : "Ongoing"}
              </Text>
              <Text style={styles.historyCount}>
                {session.records.length} students present
              </Text>
            </Card.Content>
          </Card>
        ))}
      </View>
    );
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={loadData} />
      }
    >
      <Surface style={styles.header} elevation={2}>
        <View style={styles.headerContent}>
          <View>
            <Text variant="headlineMedium" style={styles.className}>
              {classroom.name}
            </Text>
            <Text variant="bodyMedium" style={styles.classCode}>
              {classroom.description}
            </Text>
          </View>
          <View style={styles.headerActions}>
            {renderAttendanceButton()}
          </View>
        </View>
      </Surface>

      {renderAttendanceStatus()}
      {renderAttendanceHistory()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    marginTop: 10,
  },
  header: {
    backgroundColor: "#fff",
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  className: {
    fontWeight: "bold",
  },
  classCode: {
    color: "#666",
    marginTop: 4,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionButton: {
    borderRadius: 20,
  },
  attendanceStatus: {
    padding: 15,
    backgroundColor: "#fff",
    marginTop: 10,
    borderRadius: 8,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  statusTime: {
    color: "#666",
    marginBottom: 5,
  },
  statusCount: {
    color: "#666",
    marginBottom: 10,
  },
  presentStudents: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  studentChip: {
    marginRight: 5,
    marginBottom: 5,
  },
  historySection: {
    padding: 15,
    backgroundColor: "#fff",
    marginTop: 10,
    borderRadius: 8,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  historyCard: {
    marginBottom: 10,
  },
  historyDate: {
    fontSize: 16,
    fontWeight: "bold",
  },
  historyTime: {
    color: "#666",
    marginTop: 5,
  },
  historyCount: {
    color: "#666",
    marginTop: 5,
  },
});
