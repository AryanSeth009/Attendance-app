import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Users } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface Classroom {
  id: string;
  name: string;
  description: string;
  joinCode: string;
}

function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isJoining, setIsJoining] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newClassroom, setNewClassroom] = useState({ name: '', description: '' });

  useEffect(() => {
    loadClassrooms();
  }, []);

  async function loadClassrooms() {
    try {
      const response = await fetch('http://localhost:3000/api/classrooms', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to load classrooms');
      const data = await response.json();
      setClassrooms(data);
    } catch (error) {
      console.error('Error loading classrooms:', error);
    }
  }

  const handleJoinClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!joinCode.trim()) {
      setError('Please enter a join code');
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/api/classrooms/join', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
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

  const handleCreateClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newClassroom.name.trim()) {
      setError('Please enter a classroom name');
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/api/classrooms', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">My Classrooms</h1>
        <div className="flex space-x-4">
          {user?.role === 'student' && (
            <button
              onClick={() => setIsJoining(!isJoining)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Users className="h-4 w-4 mr-2" />
              Join Classroom
            </button>
          )}
          {user?.role === 'admin' && (
            <button
              onClick={() => setIsCreating(!isCreating)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Classroom
            </button>
          )}
        </div>
      </div>

      {isJoining && (
        <form onSubmit={handleJoinClassroom} className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex space-x-4">
            <div className="flex-grow">
              <label htmlFor="joinCode" className="sr-only">
                Class Code
              </label>
              <input
                type="text"
                id="joinCode"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Enter class code"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Join
            </button>
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
        </form>
      )}

      {isCreating && (
        <form onSubmit={handleCreateClassroom} className="bg-white p-6 rounded-lg shadow-sm">
          <div className="space-y-4">
            <div>
              <label htmlFor="className" className="block text-sm font-medium text-gray-700">
                Class Name
              </label>
              <input
                type="text"
                id="className"
                value={newClassroom.name}
                onChange={(e) => setNewClassroom(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                value={newClassroom.description}
                onChange={(e) => setNewClassroom(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Create Classroom
              </button>
            </div>
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
        </form>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {classrooms.map((classroom) => (
          <div
            key={classroom.id}
            onClick={() => navigate(`/classroom/${classroom.id}`)}
            className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 truncate">
                {classroom.name}
              </h3>
              <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                {classroom.description}
              </p>
            </div>
            <div className="bg-gray-50 px-4 py-4 sm:px-6">
              <div className="text-sm text-gray-500">
                Code: {classroom.joinCode}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;