import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, UserCheck, Clock } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface ClassroomData {
  id: string;
  name: string;
  description: string;
}

interface AttendanceRecord {
  id: string;
  status: 'present' | 'absent' | 'late';
  createdAt: string;
  student: {
    email: string;
  };
}

function Classroom() {
  const { id } = useParams<{ id: string }>();
  const [classroom, setClassroom] = useState<ClassroomData | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [isMarking, setIsMarking] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    if (id) {
      loadClassroom();
      loadAttendanceRecords();
    }
  }, [id]);

  async function loadClassroom() {
    try {
      const response = await fetch(`http://localhost:3000/api/classrooms/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to load classroom');
      const data = await response.json();
      setClassroom(data);
    } catch (error) {
      console.error('Error loading classroom:', error);
    }
  }

  async function loadAttendanceRecords() {
    try {
      const response = await fetch(`http://localhost:3000/api/attendance/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to load attendance records');
      const data = await response.json();
      setAttendanceRecords(data);
    } catch (error) {
      console.error('Error loading attendance records:', error);
    }
  }

  const markAttendance = async () => {
    setIsMarking(true);
    try {
      const response = await fetch(`http://localhost:3000/api/attendance/${id}/mark`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
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
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading classroom...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-2xl font-bold text-gray-900">{classroom.name}</h2>
          <p className="mt-1 text-gray-500">{classroom.description}</p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">Mark Attendance</h3>
            {user?.role === 'student' && (
              <button
                onClick={markAttendance}
                disabled={isMarking}
                className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  isMarking
                    ? 'bg-indigo-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                }`}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {isMarking ? 'Verifying...' : 'Mark Present'}
              </button>
            )}
          </div>

          <div className="mt-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Recent Attendance</h4>
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                      Student
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {attendanceRecords.map((record) => (
                    <tr key={record.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                        {record.student.email}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            record.status === 'present'
                              ? 'bg-green-100 text-green-800'
                              : record.status === 'late'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {record.status === 'present' ? (
                            <UserCheck className="h-3 w-3 mr-1" />
                          ) : record.status === 'late' ? (
                            <Clock className="h-3 w-3 mr-1" />
                          ) : null}
                          {record.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {new Date(record.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Classroom;