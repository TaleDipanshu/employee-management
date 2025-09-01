import React, { useState, useEffect } from 'react';
import { Calendar, User, FileText, Scale, RefreshCw, AlertCircle, Search } from 'lucide-react';
import axios from 'axios';

// Types
interface FormResponse {
  Timestamp: string;
  Name: string;
  'Admission Form': string;
  'Legal Form': string;
}

interface ApiResponse {
  success: boolean;
  data: FormResponse[];
  error?: string;
  message?: string;
}

const FormResponsesTable: React.FC = () => {
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const filteredResponses = responses.filter(response =>
    response.Name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    response["Admission Form"].toLowerCase().includes(searchQuery.toLowerCase()) ||
    response["Legal Form"].toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedResponses = [...filteredResponses].sort((a, b) => a.Name.localeCompare(b.Name));

  // Replace with your deployed Google Apps Script Web App URL
  const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw9NISLuti3a4f9RGSFufS9VOguC-SAZJrq7R15JQdh2v-Usp1SfINag7LGn35PTlrZ/exec';

  const fetchFormResponses = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(GOOGLE_APPS_SCRIPT_URL, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse = response.data;

      if (data.success) {
        setResponses(data.data);
        setLastUpdated(new Date().toLocaleString());
      } else {
        setError(data.error || 'Failed to fetch data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFormResponses();
  }, []);

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return timestamp;
    }
  };

  const getStatusColor = (status: string) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower.includes('complete') || statusLower.includes('submitted')) {
      return 'bg-green-100 text-green-800 border-green-200';
    } else if (statusLower.includes('pending') || statusLower.includes('in progress')) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    } else if (statusLower.includes('rejected') || statusLower.includes('cancelled')) {
      return 'bg-red-100 text-red-800 border-red-200';
    }
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="flex items-center justify-center">
              <RefreshCw className="animate-spin h-8 w-8 text-purple-600 mr-3" />
              <span className="text-lg text-gray-600">Loading form responses...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-red-200 p-8">
            <div className="flex items-center text-red-600 mb-4">
              <AlertCircle className="h-6 w-6 mr-2" />
              <h2 className="text-xl font-semibold">Error Loading Data</h2>
            </div>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={fetchFormResponses}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Form Responses</h1>
              <p className="text-gray-600">
                Total responses: <span className="font-semibold">{sortedResponses.length}</span>
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-3 items-center">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-600 pr-10"
                />
                <Search className="absolute top-2.5 right-3 text-blue-400" />
              </div>
              <p className='text-blue-700'>
                Link(currently stopped taking responses)
              </p>
              {lastUpdated && (
                <span className="text-sm text-gray-500">
                  Last updated: {lastUpdated}
                </span>
              )}
              <button
                onClick={fetchFormResponses}
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-md transition-colors flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {sortedResponses.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No responses found</h3>
              <p className="text-gray-600">Try adjusting your search query.</p>
            </div>
          )
            : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-purple-600">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Timestamp
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Name
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Admission Form
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <Scale className="h-4 w-4" />
                        Legal Form
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 justify-center">
                 test data here only
                </tbody>
              </table>
            </div>
          )
          }
        </div>

        {/* Footer */}
        {sortedResponses.length > 0 && (
          <div className="mt-6 text-center text-sm text-gray-500">
            Showing {sortedResponses.length} {sortedResponses.length === 1 ? "response" : "responses"}
          </div>
        )}
      </div>
    </div>
  );
};

export default FormResponsesTable;
