const RB = ReactBootstrap;
const { Alert, Card, Button, Table, Modal } = ReactBootstrap;

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBCskREDnAnjt79_6DpWSYmxpZrlTfXZM8",
    authDomain: "studentsync-81e07.firebaseapp.com",
    projectId: "studentsync-81e07",
    storageBucket: "studentsync-81e07.firebasestorage.app",
    messagingSenderId: "808743235044",
    appId: "1:808743235044:web:2b9ce02597b93129ccabf1",
    measurementId: "G-3B66SGKYEH"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

const defaultImages = [
    "https://img.freepik.com/premium-photo/3d-rendering-graduation-cap-books-realistic-3d-shapes-education-online-concept_460848-11448.jpg",
    "https://img.freepik.com/free-photo/3d-rendering-graduation-cap-magnifying-glass-bulb-with-books-realistic-3d-shapes-education-online-concept_460848-12233.jpg",
    "https://img.freepik.com/premium-photo/3d-rendering-graduation-cap-books-realistic-3d-shapes-education-online-concept_460848-10843.jpg",
    "https://png.pngtree.com/thumb_back/fh260/background/20230624/pngtree-realistic-3d-education-online-concept-graduation-cap-books-and-mobile-phone-image_3670145.jpg"
];

// ฟังก์ชันสุ่มเลือกรูปภาพจาก defaultImages
const getRandomImage = () => defaultImages[Math.floor(Math.random() * defaultImages.length)];

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            classrooms: [],
            user: null,
            classCode: "",
            className: "",
            classRoom: "",
            classPhoto: "",
            editClassCode: "",
            editClassName: "",
            editClassRoom: "",
            editClassPhoto: "",
            showCreateClassForm: false,  // สำหรับแสดงฟอร์มเพิ่มห้องเรียน
            showEditClassForm: false, // สำหรับแสดงฟอร์มแก้ไขห้องเรียน
            classToEdit: null, // ข้อมูลห้องเรียนที่ต้องการแก้ไข
            viewMode: 'table',
            showEditProfileForm: false, // For showing the profile editing form
            showDetailView: false, // For showing the detail view
            classToView: null, // Data of the class to view details
            showCheckinModal: false,
            checkinToVerify: null,
            inputCode: ["", "", "", "", "", ""],
            showSuccessModal: false,
            checkinTime: "",
            showJoinClassModal: false
        };

        auth.onAuthStateChanged((user) => {
            console.log("User UID: ", user ? user.uid : "No user");
            this.setState({ user: user ? user.toJSON() : null });
            if (user) {
                this.loadClassrooms(user.uid);
            }
        });
    }

    editClass = (classData) => {
        this.setState({
            showEditClassForm: true,
            showCreateClassForm: false, // ปิดฟอร์มสร้างถ้ามี
            classToEdit: classData, // เก็บข้อมูลของ class ที่ต้องการแก้ไข
            editClassCode: classData.info.code, // Set current class code
            editClassName: classData.info.name, // Set current class name
            editClassRoom: classData.info.room, // Set current class room
            editClassPhoto: classData.info.photo // Set current class photo
        });
    };

    editProfile = () => {
        const user = this.state.user;
        this.setState({
            showEditProfileForm: true,
            editUserName: user.displayName,
            editUserPhoto: user.photoURL
        });
    };

    saveProfile = () => {
        const user = this.state.user;
        const userRef = db.collection("user").doc(user.uid);

        userRef.update({
            name: this.state.editUserName,
            photo: this.state.editUserPhoto
        }).then(() => {
            console.log("Profile updated successfully");
            this.setState({ showEditProfileForm: false });
            window.location.reload();
        }).catch((error) => {
            console.error("Error updating profile: ", error);
        });
    };

    loadClassrooms(uid) {
        db.collection("classroom").onSnapshot(async (querySnapshot) => {
            let classroomsList = [];
            let promises = [];
    
            querySnapshot.forEach((doc) => {
                const classroomData = { id: doc.id, ...doc.data() };
                promises.push(this.getUserById(classroomData.owner).then((ownerData) => {
                    classroomData.ownerName = ownerData.name;
                    classroomData.ownerPhoto = ownerData.photo;
                    classroomsList.push(classroomData);
                }));
            });
    
            await Promise.all(promises);
            this.setState({ classrooms: classroomsList });
        });
    }
    
    getUserById(uid) {
        return db.collection("user").doc(uid).get()
            .then((doc) => {
                if (doc.exists) {
                    return doc.data(); // Return the entire user data
                } else {
                    return { name: "ไม่มีข้อมูล", photo: "" }; // Default values if user data doesn't exist
                }
            })
            .catch((error) => {
                console.error("Error getting user:", error);
                return { name: "ไม่สามารถดึงข้อมูลได้", photo: "" };
            });
    }

    insertClass() {
        const classPhoto = this.state.classPhoto || getRandomImage();

        db.collection("classroom").add({
            info: {
                code: this.state.classCode,
                name: this.state.className,
                room: this.state.classRoom,
                photo: classPhoto,
            },
            owner: this.state.user.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            console.log("Classroom added successfully");
            console.error("Error adding classroom: ", error);
        });
    }

    saveEditedClass() {
        const updatedClassroom = {
            info: {
                code: this.state.editClassCode,
                name: this.state.editClassName,
                room: this.state.editClassRoom,
                photo: this.state.editClassPhoto, // คุณอาจเพิ่มฟังก์ชันการอัปเดตภาพในนี้ด้วย
            }
        };

        db.collection("classroom").doc(this.state.classToEdit.id).update(updatedClassroom)
            .then(() => {
                console.log("Classroom updated successfully");
                this.setState({ showEditClassForm: false });
            })
            .catch((error) => {
                console.error("Error updating classroom: ", error);
            });
    }

    deleteClass = (classroom) => {
        if (confirm("คุณต้องการลบห้องเรียนนี้ใช่หรือไม่?")) {
            db.collection("classroom").doc(classroom.id).delete()
                .then(() => {
                    console.log("Classroom deleted successfully");
                    this.setState({ showEditClassForm: false });
                })
                .catch((error) => {
                    console.error("Error deleting classroom: ", error);
                });
        }
    }

    googleLogin() {
        let provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope("profile");
        provider.addScope("email");

        auth.signInWithPopup(provider)
            .then((result) => {
                const user = result.user;
                this.saveUserToDatabase(user); // บันทึกข้อมูลผู้ใช้
            })
            .catch((error) => {
                console.error("Error during login:", error);
            });
    }

    googleLogout() {
        if (confirm("ต้องการออกจากระบบหรือไม่?")) {
            auth.signOut().then(() => {
                window.location.reload(); // รีเฟรชหน้าเมื่อออกจากระบบสำเร็จ
            });
        }
    }

    saveUserToDatabase(user) {
        const userRef = db.collection("user").doc(user.uid);

        userRef.set({
            name: user.displayName,
            email: user.email,
            photo: user.photoURL,
            createdAt: user.metadata.creationTime
            // createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }) // ใช้ merge เพื่อไม่เขียนทับข้อมูลเก่า
            .then(() => {
                console.log("User added/updated in Firestore");

                const classRef = userRef.collection("classroom");
                classRef.doc("sample_class").set({
                    code: "CS101",
                    name: "Introduction to Computer Science",
                    room: "A101",
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                }).then(() => {
                    console.log("Sample class added to user's subcollection");
                });
            })
            .catch((error) => {
                console.error("Error adding/updating user:", error);
            });
    }

    handleEditClick = (classroom) => {
        this.setState({
            showEditClassForm: true,
            classToEdit: classroom,
            editClassCode: classroom.info.code,
            editClassName: classroom.info.name,
            editClassRoom: classroom.info.room,
            editClassPhoto: classroom.info.photo
        });
    }

    toggleViewMode = () => {
        this.setState({ viewMode: this.state.viewMode === 'table' ? 'card' : 'table' });
    };

    showCreateClassForm = () => {
        this.setState({
            showCreateClassForm: true,
            showEditClassForm: false,
            classCode: "",
            className: "",
            classRoom: "",
            classPhoto: ""
        });
    };

    viewClassDetails = (classData) => {
        this.setState({
            showDetailView: true,
            classToView: classData,
        });
    };

    handleInputCodeChange = (index, value) => {
        const newCode = [...this.state.inputCode];
        newCode[index] = value;
        this.setState({ inputCode: newCode }, () => {
            if (value && index < 5) {
                document.getElementById(`input-code-${index + 1}`).focus();
            }
        });
    };

    verifyCheckinCode = () => {
        const { checkinToVerify, inputCode } = this.state;
        const code = inputCode.join("");
        if (checkinToVerify.code === code) {
            this.saveStudentCheckin();
        } else {
            alert("รหัสเช็คชื่อไม่ถูกต้อง โปรดลองอีกครั้ง");
        }
    };

    saveStudentCheckin = () => {
        const { checkinToVerify } = this.state;
        const { classData } = this.props;
        const user = this.props.app.state.user;

        db.collection("classroom").doc(classData.id).collection("checkin").doc(checkinToVerify.id).collection("students").doc(user.uid).set({
            name: user.displayName,
            remark: "Checked in",
            date: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            console.log("Student check-in saved successfully");
            this.setState({ 
                showCheckinModal: false, 
                inputCode: ["", "", "", "", "", ""],
                showSuccessModal: true // Show success modal
            }, () => {
                this.loadCheckins(); // Reload checkins to reflect the updated state
            });
        }).catch((error) => {
            console.error("Error saving student check-in: ", error);
        });
    };

    render() {
        if (!this.state.user) {
            return <LoginPage app={this} />;
        }

        return (
            <Card>
                <Card.Header>
                    <div className="header">
                        <Alert variant="info" className="title">
                            StudentSync
                            <p>The Smart Way to Connect and Answer</p>
                        </Alert>
                        <LoginBox user={this.state.user} app={this} />
                    </div>
                </Card.Header>
                <Card.Body>
                    {this.state.showEditProfileForm && (
                        <EditProfileForm app={this} />
                    )}
                    {this.state.showDetailView && this.state.classToView && (
                        <ClassDetailView classData={this.state.classToView} onClose={() => this.setState({ showDetailView: false })} app={this} />
                    )}
                    {!this.state.showCreateClassForm && !this.state.showEditClassForm && !this.state.showEditProfileForm && !this.state.showDetailView && (
                        <div className="d-flex gap-2 btnGroup">
                            <Button onClick={this.showCreateClassForm} className="btn btn-primary">
                                Create Class <i className="fa fa-plus"></i>
                            </Button>
                            <Button onClick={this.toggleViewMode} className="btn btn-secondary">
                                View Mode ({this.state.viewMode === 'table' ? 'Card' : 'Table'}){' '}
                                <i className={this.state.viewMode === 'table' ? 'fa fa-th-large' : 'fa fa-th-list'}></i>
                            </Button>
                        </div>
                    )}

                    {this.state.showCreateClassForm && (
                        <CreateClassForm app={this} />
                    )}

                    {this.state.showEditClassForm && this.state.classToEdit && (
                        <EditClassForm app={this} />
                    )}

                    {!this.state.showCreateClassForm && !this.state.showEditClassForm && !this.state.showEditProfileForm && !this.state.showDetailView && (
                        this.state.viewMode === 'table' ? (
                            <ClassroomTable data={this.state.classrooms} onEditClick={this.handleEditClick} onDeleteClick={this.deleteClass} onViewClick={this.viewClassDetails} />
                        ) : (
                            <ClassroomCards data={this.state.classrooms} onEditClick={this.handleEditClick} onViewClick={this.viewClassDetails} />
                        )
                    )}
                </Card.Body>
                <Card.Footer className="text-center">
                    College of Computing, Khon Kaen University By UIIA
                </Card.Footer>
                <Modal show={this.state.showCheckinModal} onHide={() => this.setState({ showCheckinModal: false })}>
                    <Modal.Header closeButton>
                        <Modal.Title>Check-in</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <div className="form-group">
                            <label>รหัสเช็คชื่อ</label>
                            <div className="d-flex gap-2">
                                {this.state.inputCode.map((digit, index) => (
                                    <input
                                        key={index}
                                        id={`input-code-${index}`}
                                        type="text"
                                        className="form-control text-center"
                                        maxLength="1"
                                        value={digit}
                                        onChange={(e) => this.handleInputCodeChange(index, e.target.value)}
                                    />
                                ))}
                            </div>
                        </div>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button onClick={this.verifyCheckinCode} className="btn btn-success">Verify</Button>
                        <Button onClick={() => this.setState({ showCheckinModal: false })} className="btn btn-secondary">Cancel</Button>
                    </Modal.Footer>
                </Modal>
            </Card>
        );
    }
}

function LoginPage({ app }) {
    return (
        <div className="login-page">
            <Card className="login-card">
                <Card.Header>
                    <Alert variant="info">
                        Welcome to StudentSync
                        <p>Please log in to continue</p>
                    </Alert>
                </Card.Header>
                <Card.Body>
                    <Button onClick={() => app.googleLogin()} className="btn btn-primary btn-login">
                        <img src="./images/google-symbol.png" alt="google-symbol" className="google-logo"/> Login with Google
                    </Button>
                </Card.Body>
            </Card>
        </div>
    );
}

function LoginBox(props) {
    const user = props.user;
    const app = props.app;

    if (!user) {
        return (
            <div>
                <Button onClick={() => app.googleLogin()}>Login</Button>
            </div>
        );
    } else {
        return (
            <div className="profile">
                <div className="profile-info">
                    <img src={user.photoURL} width="40" height="40" alt="profile" />
                    <div className="account">
                        <p>{user.displayName}</p>
                        <p className="email">{user.email}</p>
                    </div>
                </div>
                <div className="header-btn">
                    <Button onClick={() => app.editProfile()} className="btn-secondary">Edit Profile <i class="fa fa-user-pen"></i></Button>
                    <Button onClick={() => app.googleLogout()}>Logout <i className="fa fa-arrow-right-from-bracket"></i></Button>
                </div>
            </div>
        );
    }
}

function ClassroomTable({ data, onEditClick, onDeleteClick, onViewClick }) {
    // Sort data by course name
    const sortedData = data.sort((a, b) => a.info.name.localeCompare(b.info.name));

    return (
        <Table striped bordered hover responsive>
            <thead>
                <tr>
                    <th>รหัสวิชา</th>
                    <th>ชื่อวิชา</th>
                    <th>ห้องเรียน</th>
                    <th>ผู้สอน</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                {sortedData.map((classroom) => (
                    <tr key={classroom.id} onClick={() => onViewClick(classroom)}>
                        <td>{classroom.info.code}</td>
                        <td>{classroom.info.name}</td>
                        <td>{classroom.info.room}</td>
                        <td>
                            <img src={classroom.ownerPhoto || "./images/blank-profile.png"} className="owner-img" width="20" height="20" alt="profile" /> {classroom.ownerName}
                        </td>
                        <td>
                            <div className="d-flex gap-2">
                                <EditButton onClick={(e) => { onEditClick(classroom); }} />
                                <DeleteButton onClick={(e) => { onDeleteClick(classroom); }} />
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </Table>
    );
}

function ClassroomCards({ data, onEditClick, onViewClick }) {
    return (
        <div className="row">
            {data.map((classroom) => (
                <div key={classroom.id} className="col-md-3 mb-4 d-flex align-items-stretch" onClick={() => onViewClick(classroom)}>
                    <Card className="card-item">
                        <Card.Img
                            variant="top"
                            className="card-img"
                            src={classroom.info.photo}
                        />
                        <Card.Body>
                            <Card.Title className="card-title">{classroom.info.name}</Card.Title>
                            <button
                                className="btn btn-light position-absolute top-0 end-0 m-3"
                                onClick={(e) => { e.stopPropagation(); onEditClick(classroom); }} // Prevent event propagation to avoid triggering onViewClick
                            >
                                <i className="fas fa-ellipsis-h"></i>
                            </button>
                            <Card.Subtitle className="mb-2 text-muted">รหัสวิชา: {classroom.info.code}</Card.Subtitle>
                            <Card.Text>
                                <strong>ห้องเรียน:</strong> {classroom.info.room} <br /><br />
                                <img src={classroom.ownerPhoto || "./images/blank-profile.png"} className="owner-img" width="20" height="20" alt="profile" /> {classroom.ownerName}
                            </Card.Text>
                        </Card.Body>
                    </Card>
                </div>
            ))}
        </div>
    );
}

function TextInput({ label, app, value, style }) {
    return (
        <label className="form-label">
            {label}:
            <input
                className="form-control"
                style={style}
                value={app.state[value]}
                onChange={(ev) => {
                    var s = {};
                    s[value] = ev.target.value;
                    app.setState(s);
                }}
            ></input>
        </label>
    );
}

function EditButton({ onClick }) {
    return (
        <button className="actionBtn" onClick={(e) => { e.stopPropagation(); onClick(); }}>
            <i className="fa-regular fa-pen-to-square"></i> แก้ไข
        </button>
    );
}

function DeleteButton({ onClick }) {
    return (
        <button className="actionBtn" onClick={(e) => { e.stopPropagation(); onClick(); }}>
            <i className="far fa-trash-alt"></i> ลบ
        </button>
    );
}

function CreateClassForm({ app }) {
    return (
        <div>
            <p class="addTitle">เพิ่มข้อมูลชั้นเรียน</p>
            <div className="d-flex gap-2">
                <TextInput label="รหัสวิชา" app={app} value="classCode" />
                <TextInput label="ชื่อวิชา" app={app} value="className" />
                <TextInput label="ห้อง" app={app} value="classRoom" />
                <div className="form-group">
                    <label>เลือกรูปภาพ</label>
                    <input
                        type="file"
                        className="form-control"
                        onChange={(e) => app.setState({ classPhoto: URL.createObjectURL(e.target.files[0]) })}
                    />
                </div>
            </div>
            <div className="d-flex gap-2 btnGroup">
                <Button onClick={() => {
                    app.insertClass();
                    app.setState({ showCreateClassForm: false });
                }} className="btn btn-success mt-2">
                    Save
                </Button>
                <Button onClick={() => app.setState({ showCreateClassForm: false })} className="btn btn-secondary mt-2">
                    Cancel
                </Button>
            </div>
        </div>
    );
}

function EditClassForm({ app }) {
    return (
        <div>
            <p class="addTitle">แก้ไขข้อมูลชั้นเรียน</p>
            <div className="d-flex gap-2">
                <TextInput label="รหัสวิชา" app={app} value="editClassCode" />
                <TextInput label="ชื่อวิชา" app={app} value="editClassName" />
                <TextInput label="ห้อง" app={app} value="editClassRoom" />
                <div className="form-group">
                    <label>เลือกรูปภาพ</label>
                    <input
                        type="file"
                        className="form-control"
                        onChange={(e) => app.setState({ editClassPhoto: URL.createObjectURL(e.target.files[0]) })}
                    />
                </div>
            </div>
            <div className="d-flex gap-2 btnGroup">
                <Button onClick={() => { app.saveEditedClass(); app.setState({ showEditClassForm: false }); }} className="btn btn-success mt-2">
                    Save Changes
                </Button>
                <Button onClick={() => app.deleteClass(app.state.classToEdit)} className="btn btn-danger mt-2">
                    Delete Class
                </Button>
                <Button onClick={() => app.setState({ showEditClassForm: false })} className="btn btn-secondary mt-2">
                    Cancel
                </Button>
            </div>
        </div>
    );
}

function EditProfileForm({ app }) {
    return (
        <div>
            <p className="addTitle">Edit Profile</p>
            <div className="d-flex gap-2">
                <TextInput label="Name" app={app} value="editUserName" />
                <div className="form-group">
                    <label>Profile Picture</label>
                    <input
                        type="file"
                        className="form-control"
                        onChange={(e) => app.setState({ editUserPhoto: URL.createObjectURL(e.target.files[0]) })}
                    />
                </div>
            </div>
            <div className="d-flex gap-2 btnGroup">
                <Button onClick={() => app.saveProfile()} className="btn btn-success mt-2">
                    Save Changes
                </Button>
                <Button onClick={() => app.setState({ showEditProfileForm: false })} className="btn btn-secondary mt-2">
                    Cancel
                </Button>
            </div>
        </div>
    );
}

class ClassDetailView extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            students: [],
            users: [],
            checkins: [],
            studentToEdit: null,
            editStudentName: "",
            editStudentStatus: 0,
            showModal: false,
            showAddStudentModal: false,
            showAddCheckinModal: false,
            selectedUserId: "",
            checkinCode: ["", "", "", "", "", ""], // Array for 6-digit code
            checkinDate: "",
            checkinStatus: 0,
            showCheckinModal: false,
            checkinToVerify: null,
            inputCode: ["", "", "", "", "", ""],
            showSuccessModal: false,
            checkinTime: "",
            showJoinClassModal: false,
            checkinError: "", // เพิ่มสถานะใหม่สำหรับข้อความแจ้งเตือน
            checkinStudents: [],
            showCheckinStudentsModal: false,
            showEditStudentModal: false,
            editStudentRemark: ""
        };
    }

    componentDidMount() {
        this.loadStudents();
        this.loadUsers();
        this.loadCheckins();
    }

    loadStudents() {
        const { classData } = this.props;
        db.collection("classroom").doc(classData.id).collection("students").get()
            .then((querySnapshot) => {
                let studentsList = [];
                querySnapshot.forEach((doc) => {
                    studentsList.push({ id: doc.id, ...doc.data() });
                });
                this.setState({ students: studentsList });
            })
            .catch((error) => {
                console.error("Error getting students: ", error);
            });
    }

    loadUsers() {
        db.collection("user").get()
            .then((querySnapshot) => {
                let usersList = [];
                querySnapshot.forEach((doc) => {
                    usersList.push({ id: doc.id, ...doc.data() });
                });
                this.setState({ users: usersList });
            })
            .catch((error) => {
                console.error("Error getting users: ", error);
            });
    }

    loadCheckins() {
        const { classData } = this.props;
        db.collection("classroom").doc(classData.id).collection("checkin").get()
            .then((querySnapshot) => {
                let checkinsList = [];
                querySnapshot.forEach((doc) => {
                    checkinsList.push({ id: doc.id, ...doc.data() });
                });
                this.setState({ checkins: checkinsList });
            })
            .catch((error) => {
                console.error("Error getting checkins: ", error);
            });
    }

    handleEditStudent = (student) => {
        this.setState({
            studentToEdit: student,
            editStudentName: student.name,
            editStudentStatus: student.status,
            showModal: true
        });
    }

    handleDeleteStudent = (studentId) => {
        const { classData } = this.props;
        if (confirm("คุณต้องการลบนักเรียนคนนี้ใช่หรือไม่?")) {
            db.collection("classroom").doc(classData.id).collection("students").doc(studentId).delete()
                .then(() => {
                    console.log("Student deleted successfully");
                    this.loadStudents();
                })
                .catch((error) => {
                    console.error("Error deleting student: ", error);
                });
        }
    }

    saveEditedStudent = () => {
        const { classData } = this.props;
        const { studentToEdit, editStudentName, editStudentStatus } = this.state;

        db.collection("classroom").doc(classData.id).collection("students").doc(studentToEdit.id).update({
            name: editStudentName,
            status: editStudentStatus
        }).then(() => {
            console.log("Student updated successfully");
            this.setState({ studentToEdit: null, showModal: false });
            this.loadStudents();
        }).catch((error) => {
            console.error("Error updating student: ", error);
        });
    }

    handleAddStudent = () => {
        const { classData } = this.props;
        const { selectedUserId, users } = this.state;
        const selectedUser = users.find(user => user.id === selectedUserId);

        if (selectedUser) {
            db.collection("classroom").doc(classData.id).collection("students").add({
                name: selectedUser.name,
                status: 0,
                stdid: selectedUser.id
            }).then(() => {
                console.log("Student added successfully");
                this.setState({ showAddStudentModal: false, selectedUserId: "" });
                this.loadStudents();
            }).catch((error) => {
                console.error("Error adding student: ", error);
            });
        }
    }

    handleAddCheckin = () => {
        const { classData } = this.props;
        const { checkinCode, checkinDate, checkinStatus } = this.state;
        const code = checkinCode.join(""); // Combine code array into a single string

        // Get the number of documents in the checkin collection
        db.collection("classroom").doc(classData.id).collection("checkin").get()
            .then((querySnapshot) => {
                const newCheckinId = querySnapshot.size + 1; // New ID is the count of documents + 1

                db.collection("classroom").doc(classData.id).collection("checkin").doc(newCheckinId.toString()).set({
                    code: code,
                    date: checkinDate,
                    status: checkinStatus
                }).then(() => {
                    console.log("Check-in added successfully");
                    this.setState({ showAddCheckinModal: false, checkinCode: ["", "", "", "", "", ""], checkinDate: "", checkinStatus: 0 });
                    this.loadCheckins();
                }).catch((error) => {
                    console.error("Error adding check-in: ", error);
                });
            })
            .catch((error) => {
                console.error("Error getting check-in count: ", error);
            });
    }

    handleDateChange = (event) => {
        this.setState({ checkinDate: event.target.value });
    };

    handleCodeChange = (index, value) => {
        const newCode = [...this.state.checkinCode];
        newCode[index] = value;
        this.setState({ checkinCode: newCode }, () => {
            // Move focus to next input if value is not empty
            if (value && index < 5) {
                document.getElementById(`code-input-${index + 1}`).focus();
            }
        });
    };

    handleCodeKeyDown = (index, event) => {
        if (event.key === "Backspace" && !this.state.checkinCode[index] && index > 0) {
            // Move focus to previous input if current input is empty
            document.getElementById(`code-input-${index - 1}`).focus();
        }
    };

    generateRandomCode = () => {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const randomCode = Array.from({ length: 6 }, () => characters[Math.floor(Math.random() * characters.length)]);
        this.setState({ checkinCode: randomCode });
    };

    handleEditCheckin = (checkin) => {
        this.setState({
            checkinToEdit: checkin,
            checkinCode: checkin.code.split(""),
            checkinDate: checkin.date,
            checkinStatus: checkin.status,
            showAddCheckinModal: true
        });
    };

    handleDeleteCheckin = (checkinId) => {
        const { classData } = this.props;
        if (confirm("คุณต้องการลบการเช็คชื่อครั้งนี้ใช่หรือไม่?")) {
            db.collection("classroom").doc(classData.id).collection("checkin").doc(checkinId).delete()
                .then(() => {
                    console.log("Check-in deleted successfully");
                    this.loadCheckins();
                })
                .catch((error) => {
                    console.error("Error deleting check-in: ", error);
                });
        }
    }

    saveEditedCheckin = () => {
        const { classData } = this.props;
        const { checkinToEdit, checkinCode, checkinDate, checkinStatus } = this.state;
        const code = checkinCode.join(""); // Combine code array into a single string

        db.collection("classroom").doc(classData.id).collection("checkin").doc(checkinToEdit.id).update({
            code: code,
            date: checkinDate,
            status: checkinStatus
        }).then(() => {
            console.log("Check-in updated successfully");
            this.setState({ showAddCheckinModal: false, checkinCode: ["", "", "", "", "", ""], checkinDate: "", checkinStatus: 0 });
            this.loadCheckins();
        }).catch((error) => {
            console.error("Error updating check-in: ", error);
        });
    };

    handleInputCodeChange = (index, value) => {
        const newCode = [...this.state.inputCode];
        newCode[index] = value;
        this.setState({ inputCode: newCode }, () => {
            if (value && index < 5) {
                document.getElementById(`input-code-${index + 1}`).focus();
            }
        });
    };

    handleInputCodeKeyDown = (index, event) => {
        if (event.key === "Backspace" && !this.state.inputCode[index] && index > 0) {
            // Move focus to previous input if current input is empty
            document.getElementById(`input-code-${index - 1}`).focus();
        }
    };

    verifyCheckinCode = () => {
        const { checkinToVerify, inputCode } = this.state;
        const code = inputCode.join("");
        if (checkinToVerify.code === code) {
            this.saveStudentCheckin();
        } else {
            this.setState({ checkinError: "รหัสเช็คชื่อไม่ถูกต้อง โปรดลองอีกครั้ง" });
        }
    };

    saveStudentCheckin = () => {
        const { checkinToVerify } = this.state;
        const { classData } = this.props;
        const user = this.props.app.state.user;

        db.collection("classroom").doc(classData.id).collection("checkin").doc(checkinToVerify.id).collection("students").doc(user.uid).set({
            name: user.displayName,
            remark: "Checked in",
            date: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            console.log("Student check-in saved successfully");
            this.setState({ 
                showCheckinModal: false, 
                inputCode: ["", "", "", "", "", ""],
                showSuccessModal: true // Show success modal
            }, () => {
                this.loadCheckins(); // Reload checkins to reflect the updated state
            });
        }).catch((error) => {
            console.error("Error saving student check-in: ", error);
        });
    };

    joinClass = () => {
        const { classData } = this.props;
        const user = this.props.app.state.user;

        db.collection("classroom").doc(classData.id).collection("students").doc(user.uid).set({
            name: user.displayName,
            status: 0,
            stdid: user.uid
        }).then(() => {
            console.log("Student added to class successfully");
            this.setState({ showJoinClassModal: false });
            this.loadStudents(); // Reload students to reflect the updated state
        }).catch((error) => {
            console.error("Error adding student to class: ", error);
        });
    };

    confirmAllStudents = () => {
        const { classData } = this.props;
        const batch = db.batch();

        this.state.students.forEach((student) => {
            if (student.status === 0) { // Check if student is waiting for confirmation
                const studentRef = db.collection("classroom").doc(classData.id).collection("students").doc(student.id);
                batch.update(studentRef, { status: 1 });
            }
        });

        batch.commit().then(() => {
            console.log("All students confirmed successfully");
            this.loadStudents(); // Reload students to reflect the updated state
        }).catch((error) => {
            console.error("Error confirming students: ", error);
        });
    };

    loadCheckinStudents = (checkinId) => {
        const { classData } = this.props;
        db.collection("classroom").doc(classData.id).collection("checkin").doc(checkinId).collection("students").get()
            .then((querySnapshot) => {
                let studentsList = [];
                querySnapshot.forEach((doc) => {
                    studentsList.push({ id: doc.id, ...doc.data() });
                });
                this.setState({ 
                    checkinStudents: studentsList, 
                    showCheckinStudentsModal: true, 
                    checkinToView: checkinId,
                    noCheckinStudents: studentsList.length === 0 // Set flag if no students
                });
            })
            .catch((error) => {
                console.error("Error getting checkin students: ", error);
            });
    };

    handleEditCheckinStudent = (student) => {
        this.setState({
            studentToEdit: student,
            editStudentName: student.name,
            editStudentRemark: student.remark,
            showEditStudentModal: true
        });
    };

    handleDeleteCheckinStudent = (checkinId, studentId) => {
        const { classData } = this.props;
        if (confirm("คุณต้องการลบนักเรียนคนนี้ใช่หรือไม่?")) {
            db.collection("classroom").doc(classData.id).collection("checkin").doc(checkinId).collection("students").doc(studentId).delete()
                .then(() => {
                    console.log("Student deleted successfully");
                    this.loadCheckinStudents(checkinId);
                })
                .catch((error) => {
                    console.error("Error deleting student: ", error);
                });
        }
    };

    saveEditedCheckinStudent = () => {
        const { classData } = this.props;
        const { studentToEdit, editStudentName, editStudentRemark, checkinToView } = this.state;

        db.collection("classroom").doc(classData.id).collection("checkin").doc(checkinToView).collection("students").doc(studentToEdit.id).update({
            name: editStudentName,
            remark: editStudentRemark
        }).then(() => {
            console.log("Student updated successfully");
            this.setState({ studentToEdit: null, showEditStudentModal: false });
            this.loadCheckinStudents(checkinToView);
        }).catch((error) => {
            console.error("Error updating student: ", error);
        });
    };

    render() {
        const { classData, onClose } = this.props;
        const { students, users, checkins, studentToEdit, editStudentName, editStudentStatus, showModal, showAddStudentModal, showAddCheckinModal, selectedUserId, checkinCode, checkinDate, checkinStatus, showCheckinModal, inputCode, showSuccessModal, checkinTime, showJoinClassModal, checkinError, checkinStudents, showCheckinStudentsModal, showEditStudentModal, editStudentRemark, checkinToView } = this.state;
        const user = this.props.app.state.user;

        if (showCheckinStudentsModal && checkinToView) {
            return (
                <CheckinDetailView
                    checkin={checkinToView}
                    students={checkinStudents}
                    onClose={() => this.setState({ showCheckinStudentsModal: false, checkinToView: null, checkinStudents: [] })}
                    onEditStudent={this.handleEditCheckinStudent}
                    onDeleteStudent={this.handleDeleteCheckinStudent}
                    noCheckinStudents={this.state.noCheckinStudents}
                    showEditStudentModal={showEditStudentModal}
                    editStudentName={editStudentName}
                    editStudentRemark={editStudentRemark}
                    handleEditStudentChange={(changes) => this.setState(changes)}
                    saveEditedCheckinStudent={this.saveEditedCheckinStudent}
                />
            );
        }

        return (
            <div className="class-detail-view">
                <Card>
                    <Card.Body>
                        <div className="detail-info">
                            <img src={classData.info.photo} className="detail-img"/>
                            <div className="detail-text">
                                <div>
                                    <Card.Title>{classData.info.name}</Card.Title>
                                    <Card.Subtitle className="mb-2 text-muted">รหัสวิชา: {classData.info.code}</Card.Subtitle>
                                    <Card.Text>
                                        <strong>ห้องเรียน:</strong> {classData.info.room} <br />
                                    </Card.Text>
                                </div>
                                <Card.Text><img src={classData.ownerPhoto || "./images/blank-profile.png"} className="owner-img" width="20" height="20" alt="profile" /> {classData.ownerName}</Card.Text>
                            </div>
                        </div>
                    </Card.Body>
                    <Card.Footer>
                        <div className="header-btn">
                            <Button onClick={onClose} className="btn btn-secondary">Back to Home <i className="fa fa-house"></i></Button>
                            <Button onClick={() => this.setState({ showJoinClassModal: true })} className="btn btn-primary">Join Class <i className="fa fa-arrow-right-to-bracket"></i></Button>
                        </div>
                    </Card.Footer>
                </Card>
                <div className="title-container mb-3 mt-5">
                    <h5>Class Detail</h5>
                    <p>View details and share the link to join the class!</p>  
                </div>
                <a href={`https://quickchart.io/qr?text=${classData.id}`}><img className="qr-code" src={`https://quickchart.io/qr?text=${classData.id}`} alt="Join Class QR Code" /></a>
                <div className="title-with-btn">
                    <div className="title-container mb-3 mt-5">
                        <h5>Student in Class</h5>
                        <p>View and manage students in the class!</p>  
                    </div>
                    <div className="d-flex gap-2">
                        <Button onClick={() => this.setState({ showAddStudentModal: true })} className="btn btn-primary">Add Student <i className="fa fa-plus"></i></Button>
                        <Button onClick={this.confirmAllStudents} className="btn btn-secondary">Confirm All <i className="fa fa-check"></i></Button>
                    </div>
                </div>
                <Table striped bordered hover responsive>
                    <thead>
                        <tr>
                            <th>รหัสนักศึกษา</th>
                            <th>ชื่อนักศึกษา</th>
                            <th>สถานะ</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {students.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="text-center"><i class="fa-regular fa-face-sad-cry"></i> ยังไม่มีนักศึกษาที่ลงทะเบียนในรายวิชานี้</td>
                            </tr>
                        ) : (
                            students.map((student, index) => (
                                <tr key={index}>
                                    <td>{student.stdid}</td>
                                    <td>{student.name}</td>
                                    <td>{student.status === 1 ? (
                                            <span><i className="fa fa-check-circle" style={{ color: 'green' }}></i> ยืนยันแล้ว</span>
                                        ) : (
                                            <span><i className="fa fa-clock" style={{ color: 'orange' }}></i> รอการตรวจสอบ</span>
                                        )}</td>
                                    <td>
                                        <div className="d-flex gap-2">
                                            <EditButton onClick={() => this.handleEditStudent(student)} />
                                            <DeleteButton onClick={() => this.handleDeleteStudent(student.id)} />
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </Table>

                <div className="title-with-btn mb-3 mt-5">
                    <div className="title-container">
                        <h5>Student Check-in</h5>
                        <p>Check in and manage student attendance!</p>  
                    </div>
                    <Button onClick={() => this.setState({ showAddCheckinModal: true })} className="btn btn-primary">Add Check-in <i className="fa fa-plus"></i></Button>
                </div>
                <Table striped bordered hover responsive>
                    <thead>
                        <tr>
                            <th>ลำดับการเช็คชื่อ</th>
                            <th>รหัสเช็คชื่อ</th>
                            <th>วันเวลา</th>
                            <th>สถานะ</th>
                            <th>Action</th>
                            <th>เช็คชื่อ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {checkins.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="text-center"><i class="fa-regular fa-calendar"></i> ยังไม่มีการเช็คชื่อในรายวิชานี้</td>
                            </tr>
                        ) : (
                            checkins.map((checkin, index) => (
                                <tr key={index} onClick={() => this.loadCheckinStudents(checkin.id)}>
                                    <td>{checkin.id}</td>
                                    <td>{checkin.code}</td>
                                    <td>{checkin.date}</td>
                                    <td>
                                        {checkin.status === 0 ? (
                                            <span><i className="fa fa-clock" style={{ color: 'gray' }}></i> ยังไม่เริ่ม</span>
                                        ) : checkin.status === 1 ? (
                                            <span><i className="fa fa-clock" style={{ color: 'orange' }}></i> กำลังเช็คชื่อ</span>
                                        ) : (
                                            <span><i className="fa fa-check-circle" style={{ color: 'green' }}></i> เสร็จแล้ว</span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="d-flex gap-2">
                                            <EditButton onClick={() => this.handleEditCheckin(checkin)} />
                                            <DeleteButton onClick={() => this.handleDeleteCheckin(checkin.id)} />
                                        </div>
                                    </td>
                                    <td>
                                        {checkin.students && checkin.students[user.uid] ? (
                                            <Button className="btn btn-secondary" disabled>Checked-in at {new Date(checkin.students[user.uid].date).toLocaleString()}</Button>
                                        ) : (
                                            <Button onClick={(e) => { e.stopPropagation(); this.setState({ showCheckinModal: true, checkinToVerify: checkin }) }} className="btn btn-primary">Check-in <i class="fa-regular fa-calendar-check"></i></Button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </Table>

                <Modal show={showModal} onHide={() => this.setState({ showModal: false })}>
                    <Modal.Header closeButton>
                        <Modal.Title>Edit Student</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <div className="form-group">
                            <label>ชื่อนักศึกษา</label>
                            <input
                                type="text"
                                className="form-control"
                                value={editStudentName}
                                onChange={(e) => this.setState({ editStudentName: e.target.value }) }
                            />
                        </div>
                        <div className="form-group">
                            <label>สถานะ</label>
                            <select
                                className="form-control form-select"
                                value={editStudentStatus}
                                onChange={(e) => this.setState({ editStudentStatus: parseInt(e.target.value) }) }
                            >
                                <option value={0}>รอการตรวจสอบ</option>
                                <option value={1}>ยืนยันแล้ว</option>
                            </select>
                        </div>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button onClick={this.saveEditedStudent} className="btn btn-success">Save Changes</Button>
                        <Button onClick={() => this.setState({ showModal: false })} className="btn btn-secondary">Cancel</Button>
                    </Modal.Footer>
                </Modal>

                <Modal show={showAddStudentModal} onHide={() => this.setState({ showAddStudentModal: false })}>
                    <Modal.Header closeButton>
                        <Modal.Title>Add Student</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <div className="form-group">
                            <label>เลือกนักศึกษา</label>
                            <select
                                className="form-control form-select"
                                value={selectedUserId}
                                onChange={(e) => this.setState({ selectedUserId: e.target.value }) }
                            >
                                <option value="">เลือกนักศึกษา</option>
                                {users.map((user) => (
                                    <option key={user.id} value={user.id}>{user.name}</option>
                                ))}
                            </select>
                        </div>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button onClick={this.handleAddStudent} className="btn btn-success">Add Student</Button>
                        <Button onClick={() => this.setState({ showAddStudentModal: false })} className="btn btn-secondary">Cancel</Button>
                    </Modal.Footer>
                </Modal>

                <Modal show={showAddCheckinModal} onHide={() => this.setState({ showAddCheckinModal: false })}>
                    <Modal.Header closeButton>
                        <Modal.Title>{this.state.checkinToEdit ? "Edit Check-in" : "Add Check-in"}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <div className="form-group">
                            <label>รหัสเช็คชื่อ</label>
                            <div className="d-flex gap-2">
                                {checkinCode.map((digit, index) => (
                                    <input
                                        key={index}
                                        id={`code-input-${index}`}
                                        type="text"
                                        className="form-control text-center"
                                        maxLength="1"
                                        value={digit}
                                        onChange={(e) => this.handleCodeChange(index, e.target.value)}
                                        onKeyDown={(e) => this.handleCodeKeyDown(index, e)}
                                    />
                                ))}
                            </div>
                            <Button onClick={this.generateRandomCode} className="btn btn-secondary mt-2 mb-2">Generate Code <i class="fa fa-shuffle"></i></Button>
                        </div>
                        <div className="form-group">
                            <label>วันเวลา</label>
                            <input
                                type="datetime-local"
                                className="form-control"
                                value={checkinDate}
                                onChange={this.handleDateChange}
                            />
                        </div>
                        <div className="form-group">
                            <label>สถานะ</label>
                            <select
                                className="form-control form-select"
                                value={checkinStatus}
                                onChange={(e) => this.setState({ checkinStatus: parseInt(e.target.value) })}
                            >
                                <option value={0}>ยังไม่เริ่ม</option>
                                <option value={1}>กำลังเช็คชื่อ</option>
                                <option value={2}>เสร็จแล้ว</option>
                            </select>
                        </div>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button onClick={this.state.checkinToEdit ? this.saveEditedCheckin : this.handleAddCheckin} className="btn btn-success">
                            {this.state.checkinToEdit ? "Save Changes" : "Add Check-in"}
                        </Button>
                        <Button onClick={() => this.setState({ showAddCheckinModal: false })} className="btn btn-secondary">Cancel</Button>
                    </Modal.Footer>
                </Modal>

                <Modal show={showCheckinModal} onHide={() => this.setState({ showCheckinModal: false, checkinError: "" })}>
                    <Modal.Header closeButton>
                        <Modal.Title>Check-in</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <div className="form-group">
                            <label>รหัสเช็คชื่อ</label>
                            <div className="d-flex gap-2">
                                {inputCode.map((digit, index) => (
                                    <input
                                        key={index}
                                        id={`input-code-${index}`}
                                        type="text"
                                        className="form-control text-center"
                                        maxLength="1"
                                        value={digit}
                                        onChange={(e) => this.handleInputCodeChange(index, e.target.value)}
                                        onKeyDown={(e) => this.handleInputCodeKeyDown(index, e)}
                                    />
                                ))}
                            </div>
                            {checkinError && <p className="text-danger mt-2">{checkinError}</p>}
                        </div>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button onClick={this.verifyCheckinCode} className="btn btn-success">Verify</Button>
                        <Button onClick={() => this.setState({ showCheckinModal: false, checkinError: "" })} className="btn btn-secondary">Cancel</Button>
                    </Modal.Footer>
                </Modal>

                <Modal show={showSuccessModal} onHide={() => this.setState({ showSuccessModal: false })}>
                    <Modal.Header closeButton>
                        <Modal.Title>Check-in Successful</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <p>Check-in completed successfully!</p>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button onClick={() => this.setState({ showSuccessModal: false })} className="btn btn-primary">OK</Button>
                    </Modal.Footer>
                </Modal>

                <Modal show={showJoinClassModal} onHide={() => this.setState({ showJoinClassModal: false })}>
                    <Modal.Header closeButton>
                        <Modal.Title>Join Class</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <p>Are you sure you want to join this class?</p>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button onClick={this.joinClass} className="btn btn-success">Join</Button>
                        <Button onClick={() => this.setState({ showJoinClassModal: false })} className="btn btn-secondary">Cancel</Button>
                    </Modal.Footer>
                </Modal>

                <Modal show={showEditStudentModal} onHide={() => this.setState({ showEditStudentModal: false })}>
                    <Modal.Header closeButton>
                        <Modal.Title>Edit Check-in Student</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <div className="form-group">
                            <label>Student Name</label>
                            <input
                                type="text"
                                className="form-control"
                                value={editStudentName}
                                onChange={(e) => this.setState({ editStudentName: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label>Remark</label>
                            <input
                                type="text"
                                className="form-control"
                                value={editStudentRemark}
                                onChange={(e) => this.setState({ editStudentRemark: e.target.value })}
                            />
                        </div>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button onClick={this.saveEditedCheckinStudent} className="btn btn-success">Save Changes</Button>
                        <Button onClick={() => this.setState({ showEditStudentModal: false })} className="btn btn-secondary">Cancel</Button>
                    </Modal.Footer>
                </Modal>
            </div>
        );
    }
}

function CheckinDetailView({ checkin, students, onClose, onEditStudent, onDeleteStudent, noCheckinStudents, showEditStudentModal, editStudentName, editStudentRemark, handleEditStudentChange, saveEditedCheckinStudent }) {
    return (
        <div className="checkin-detail-view">
            <Button onClick={onClose} className="btn btn-secondary"><i className="fa fa-arrow-left"></i> Back</Button>
            <div className="title-container mb-3 mt-4">
                <h5>Attendants</h5>
                <p>View and manage students in the class!</p>  
            </div>
            <Table striped bordered hover responsive>
                <thead>
                    <tr>
                        <th>Student ID</th>
                        <th>Student Name</th>
                        <th>Remark</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {noCheckinStudents ? (
                        <tr>
                            <td colSpan="4" className="text-center"><i className="fa-regular fa-face-sad-cry"></i> ยังไม่มีนักศึกษาที่เช็คชื่อในการเรียนครั้งนี้</td>
                        </tr>
                    ) : (
                        students.map((student) => (
                            <tr key={student.id}>
                                <td>{student.stdid}</td>
                                <td>{student.name}</td>
                                <td>{student.remark}</td>
                                <td>
                                    <div className="d-flex gap-2">
                                        <EditButton onClick={() => onEditStudent(student)} />
                                        <DeleteButton onClick={() => onDeleteStudent(checkin.id, student.id)} />
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </Table>

            <Modal show={showEditStudentModal} onHide={() => handleEditStudentChange({ showEditStudentModal: false })}>
                <Modal.Header closeButton>
                    <Modal.Title>Edit Check-in Student</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="form-group">
                        <label>Student Name</label>
                        <input
                            type="text"
                            className="form-control"
                            value={editStudentName}
                            onChange={(e) => handleEditStudentChange({ editStudentName: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label>Remark</label>
                        <input
                            type="text"
                            className="form-control"
                            value={editStudentRemark}
                            onChange={(e) => handleEditStudentChange({ editStudentRemark: e.target.value })}
                        />
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button onClick={saveEditedCheckinStudent} className="btn btn-success">Save Changes</Button>
                    <Button onClick={() => handleEditStudentChange({ showEditStudentModal: false })} className="btn btn-secondary">Cancel</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}

const container = document.getElementById("myapp");
const root = ReactDOM.createRoot(container);
root.render(<App />);
