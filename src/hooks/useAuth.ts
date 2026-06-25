import { useContext } from 'react';
import { useAuth as useAuthContext } from '../context/AuthContext';

export const useAuth = useAuthContext;
