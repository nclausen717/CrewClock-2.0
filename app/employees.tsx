// Employees.tsx
import React from 'react';

interface Employee {
    id: number;
    name: string;
    email: string;
    password: string;
}

const Employees: React.FC = () => {
    const [employees, setEmployees] = React.useState<Employee[]>([]);

    React.useEffect(() => {
        // Fetch employees from API
        const fetchEmployees = async () => {
            const response = await fetch('/api/employees');
            const data = await response.json();
            setEmployees(data);
        };

        fetchEmployees();
    }, []);

    return (
        <div>
            <h1>Employees</h1>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Password</th>
                    </tr>
                </thead>
                <tbody>
                    {employees.map((employee) => (
                        <tr key={employee.id}>
                            <td>{employee.id}</td>
                            <td>{employee.name}</td>
                            <td>{employee.email}</td>
                            <td>{employee.password}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default Employees;