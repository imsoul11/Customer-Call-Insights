import { createContext, useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    fetchBackendSession,
    loginWithBackend,
    logoutBackendSession,
} from "../lib/backendData";


const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const buildSessionUser = (userData = {}) => ({
    eid: userData.eid,
    role: userData.role,
    phone: userData.phone || userData.employee_phone,
    cids: userData.cids,
    name: userData.name || userData.employee_name,
    employee_name: userData.employee_name,
    employee_phone: userData.employee_phone,
    email: userData.email,
});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const navigate = useNavigate();

    const login = async (eid, password) => {
        setLoading(true);
        setError('');
        try {
            const userData = await loginWithBackend(eid.trim(), password);
            setUser(buildSessionUser(userData));
            setIsAuthenticated(true);
        } catch (err) {
            console.error('Error during login:', err.message);
            setUser(null);
            setIsAuthenticated(false);
            setError(err.response?.data?.message || err.message || 'Error during login.');
        } finally {
            setLoading(false);
        }
    };

    // Function to handle logout
    const logout = async () => {
        setLoading(true);
        try {
            await logoutBackendSession();
        } catch (err) {
            console.error('Error during logout:', err.message);
        } finally {
            handleLogout();
            setLoading(false);
        }
    };

    // Check if the user is authenticated on initial load
     useEffect(() => {
        const restoreSession = async () => {
            setLoading(true); // Set loading while checking auth state

            try {
                const userData = await fetchBackendSession();
                setUser(buildSessionUser(userData));
                setIsAuthenticated(true);
            } catch (error) {
                if (error.response?.status && error.response.status !== 401) {
                    console.error("Error fetching session data:", error.message);
                    setError(`Error fetching session data: ${error.message}`);
                }

                setUser(null);
                setIsAuthenticated(false);
                navigate("/login");
            }

            setLoading(false); // Stop loading after checks
        };

        restoreSession();
    }, [navigate]);

    // Handle logout, remove cookies and redirect to login
    const handleLogout = () => {
        setUser(null);
        setIsAuthenticated(false);
        navigate("/login"); // Redirect to login page
    };

    const value = {
        user,
        login,
        logout,
        loading,
        error,
        isAuthenticated,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
