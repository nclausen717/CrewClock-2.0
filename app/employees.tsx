  handleAddEmployee = () => {
    const body = {};
    if (isCrewLeader) {
        body.email = email;
        // Adding password field if provided
        if (password.trim()) { body.password = password.trim(); }
    }
    // further processing...
  }