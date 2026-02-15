const handleAddEmployee = async () => {
    if (isCrewLeader) {
        body.email = email.trim();
        if (password.trim()) {
            body.password = password.trim();
        }
    }
    // Additional logic for adding employee would go here
};