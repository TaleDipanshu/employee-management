import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { TaskService } from '../lib/task.api';

interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string[];
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'completed';
  dueDate: string;
  createdDate: string;
  type: string;
  comments: string[];
}

interface TaskState {
  list: Task[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  users: any[];
}

const initialState: TaskState = {
  list: [],
  status: 'idle',
  error: null,
  users: []
};

// Async thunks
export const fetchTasks = createAsyncThunk(
  'tasks/fetch',
  async (filters?: { status?: string; priority?: string; searchTerm?: string }) => {
    const response = await TaskService.getTasks(filters);
    return response.data;
  }
);

export const addTask = createAsyncThunk(
  'tasks/add',
  async (taskData: TaskService['TaskData']) => {
    const response = await TaskService.createTask(taskData);
    return response.data.task;
  }
);

export const updateTaskStatus = createAsyncThunk(
  'tasks/updateStatus',
  async ({ id, status }: { id: string; status: string }) => {
    const response = await TaskService.updateTaskStatus(id, status);
    return response.data.task;
  }
);

export const addComment = createAsyncThunk(
  'tasks/addComment',
  async ({ taskId, text }: { taskId: string; text: string }) => {
    const response = await TaskService.addComment(taskId, text);
    return response.data.task;
  }
);

export const deleteTask = createAsyncThunk(
  'tasks/delete',
  async (id: string) => {
    const response = await TaskService.deleteTask(id);
    return response.data.id;
  }
);

const taskSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = action.payload;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || null;
      })
      .addCase(addTask.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(addTask.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = [...state.list, action.payload];
      })
      .addCase(addTask.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || null;
      })
      .addCase(addComment.fulfilled, (state, action) => {
        const index = state.list.findIndex(task => task.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
      });
  }
});

export default taskSlice.reducer;