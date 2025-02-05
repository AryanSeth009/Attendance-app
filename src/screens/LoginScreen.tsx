import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { TextInput, Button, Text, Surface, SegmentedButtons } from 'react-native-paper';
import { useAuthStore } from '../store/authStore';

export default function LoginScreen() {
  const { signIn, signUp, error: authError, isLoading } = useAuthStore();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'student'>('student');
  const [localError, setLocalError] = useState('');

  const handleSubmit = async () => {
    // Reset previous errors
    setLocalError('');

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setLocalError('Please enter a valid email address');
      return;
    }

    // Validate password strength
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters long');
      return;
    }

    try {
      if (isSignUp) {
        await signUp(email, password, role);
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      // Handle specific error scenarios
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'An unexpected error occurred';
      
      setLocalError(errorMessage);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Surface style={styles.surface} elevation={2}>
        <Text variant="headlineMedium" style={styles.title}>
          {isSignUp ? 'Create Account' : 'Sign In'}
        </Text>

        {/* Consolidated error display */}
        {(localError || authError) && (
          <Text style={styles.error}>
            {localError || authError}
          </Text>
        )}

        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          mode="outlined"
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
          error={!!localError}
        />

        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          mode="outlined"
          secureTextEntry
          style={styles.input}
          error={!!localError}
        />

        {isSignUp && (
          <SegmentedButtons
            value={role}
            onValueChange={value => setRole(value as 'admin' | 'student')}
            buttons={[
              { value: 'student', label: 'Student' },
              { value: 'admin', label: 'Admin' },
            ]}
            style={styles.roleSelector}
          />
        )}

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={isLoading}
          disabled={isLoading}
          style={styles.button}
        >
          {isSignUp ? 'Sign Up' : 'Sign In'}
        </Button>

        <Button
          mode="text"
          onPress={() => {
            setIsSignUp(!isSignUp);
            setLocalError('');
          }}
          style={styles.switchButton}
        >
          {isSignUp 
            ? 'Already have an account? Sign in' 
            : "Don't have an account? Sign up"}
        </Button>
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    justifyContent: 'center',
  },
  surface: {
    padding: 20,
    borderRadius: 10,
  },
  title: {
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
  },
  roleSelector: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
  },
  switchButton: {
    marginTop: 16,
  },
  error: {
    color: 'red',
    marginBottom: 16,
    textAlign: 'center',
  },
});