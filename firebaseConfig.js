const RB = ReactBootstrap;
const { Alert, Card, Button, Table } = ReactBootstrap;

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
    constructor() {
        super();
        this.state = {
            classrooms: [],
            user: null,
            classCode: "",
            className: "",
            roomName: "",
            showCreateClassForm: false,  // สำหรับแสดงฟอร์มเพิ่มห้องเรียน
            editClassId: null,  // เก็บ id ของห้องเรียนที่ต้องการแก้ไข
            classToEdit: null, // ข้อมูลห้องเรียนที่ต้องการแก้ไข
            viewMode: 'table'
        };

        auth.onAuthStateChanged((user) => {
            console.log("User UID: ", user.uid);
            this.setState({ user: user ? user.toJSON() : null });
            this.loadClassrooms(user.uid);
        });
    }

    editClass = (classData) => {
        this.setState({
            showEditClassForm: true,
            showCreateClassForm: false, // ปิดฟอร์มสร้างถ้ามี
            selectedClass: classData, // เก็บข้อมูลของ class ที่ต้องการแก้ไข
        });
    };

    loadClassrooms(uid) {
        db.collection("classroom").onSnapshot((querySnapshot) => {
            let classroomsList = [];
            querySnapshot.forEach((doc) => {
                const classroomData = { id: doc.id, ...doc.data() };
                this.getUserById(classroomData.owner).then((ownerName) => {
                    classroomData.ownerName = ownerName; // เพิ่มชื่อเจ้าของเข้าไป
                    classroomsList.push(classroomData); // เพิ่มข้อมูลห้องเรียนที่มีชื่อเจ้าของ
                    this.setState({ classrooms: classroomsList }); // อัพเดต state
                });
            });
        });
    }

    getUserById(uid) {
        return db.collection("user").doc(uid).get()
            .then((doc) => {
                if (doc.exists) {
                    return doc.data().name; // หรือที่อยู่ของชื่อในข้อมูลผู้ใช้
                } else {
                    return "ไม่มีข้อมูล"; // ถ้าผู้ใช้ไม่มีข้อมูล
                }
            })
            .catch((error) => {
                console.error("Error getting user:", error);
                return "ไม่สามารถดึงข้อมูลได้";
            });
    }

    insertClass() {
        db.collection("classroom").add({
            info: {
                code: this.state.classCode,
                name: this.state.className,
                room: this.state.classRoom,
                photo: getRandomImage(),
            },
            owner: this.state.user.uid,
        }).then(() => {
            console.log("Classroom added successfully");
        }).catch((error) => {
            console.error("Error adding classroom: ", error);
        });
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

    saveEditedClass() {
        const updatedClassroom = {
            code: this.state.classCode,
            name: this.state.className,
            room: this.state.classRoom,
            photo: "", // คุณอาจเพิ่มฟังก์ชันการอัปเดตภาพในนี้ด้วย
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

    deleteClass() {
        if (confirm("คุณต้องการลบห้องเรียนนี้ใช่หรือไม่?")) {
            db.collection("classroom").doc(this.state.classToEdit.id).delete()
                .then(() => {
                    console.log("Classroom deleted successfully");
                    this.setState({ showEditClassForm: false });
                })
                .catch((error) => {
                    console.error("Error deleting classroom: ", error);
                });
        }
    }


    handleEditClick(classroom) {
        this.setState({
            showEditClassForm: true,
            classToEdit: classroom
        });
    }

    toggleViewMode = () => {
        this.setState({ viewMode: this.state.viewMode === 'table' ? 'card' : 'table' });
    };


    render() {
        return (
            <Card>
                <Card.Header>
                    <div class="header">
                        <Alert variant="info">
                            StudentSync
                            <p>The Smart Way to Connect and Answer</p>
                        </Alert>
                        <LoginBox user={this.state.user} app={this} />
                    </div>
                </Card.Header>
                <Card.Body>
                    {/* ซ่อนปุ่มและ items ถ้าอยู่ในโหมดเพิ่มข้อมูลหรือแก้ไขข้อมูล */}
                    {!this.state.showCreateClassForm && !this.state.showEditClassForm && (
                        <div className="d-flex gap-2 btnGroup">
                            <Button onClick={() => this.setState({ showCreateClassForm: true })} className="btn btn-primary">
                                Create Class <i className="fa fa-plus"></i>
                            </Button>
                            <Button onClick={this.toggleViewMode} className="btn btn-secondary">
                                View Mode ({this.state.viewMode === 'table' ? 'Card' : 'Table'})
                            </Button>
                        </div>
                    )}

                    {/* แสดงฟอร์มเพิ่มข้อมูลห้องเรียน */}
                    {this.state.showCreateClassForm && (
                        <div>
                            <p class="addTitle">เพิ่มข้อมูลชั้นเรียน</p>
                            <div className="d-flex gap-2">
                                <TextInput label="รหัสวิชา" app={this} value="classCode" />
                                <TextInput label="ชื่อวิชา" app={this} value="className" />
                                <TextInput label="ห้อง" app={this} value="classRoom" />
                            </div>
                            <div className="d-flex gap-2 btnGroup">
                                <Button onClick={() => {
                                    this.insertClass();
                                    this.setState({ showCreateClassForm: false });
                                }} className="btn btn-success mt-2">
                                    Save
                                </Button>
                                <Button onClick={() => this.setState({ showCreateClassForm: false })} className="btn btn-secondary mt-2">
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* แสดงฟอร์มแก้ไขห้องเรียน */}
                    {this.state.showEditClassForm && this.state.classToEdit && (
                        <div>
                            <p class="addTitle">แก้ไขข้อมูลชั้นเรียน</p>
                            <div className="d-flex gap-2">
                                <TextInput label="รหัสวิชา" app={this} value="classCode" />
                                <TextInput label="ชื่อวิชา" app={this} value="className" />
                                <TextInput label="ห้อง" app={this} value="classRoom" />
                            </div>
                            <div className="d-flex gap-2 btnGroup">
                                <Button onClick={() => { this.saveEditedClass(); this.setState({ showEditClassForm: false }); }} className="btn btn-success mt-2">
                                    Save Changes
                                </Button>
                                <Button onClick={() => this.deleteClass()} className="btn btn-danger mt-2">
                                    Delete Class
                                </Button>
                                <Button onClick={() => this.setState({ showEditClassForm: false })} className="btn btn-secondary mt-2">
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* แสดงข้อมูลห้องเรียน */}
                    {!this.state.showCreateClassForm && !this.state.showEditClassForm && (
                            this.state.viewMode === 'table' ? (
                                <ClassroomTable data={this.state.classrooms}/>
                            ) : (
                                <ClassroomCards data={this.state.classrooms} onEditClick={(classroom) => this.handleEditClick(classroom)} />
                            )
                    )}
                </Card.Body>
                <Card.Footer className="text-center">
                    College of Computing, Khon Kaen University By 663380179-0 Phanuwat Lakronratch
                </Card.Footer>
            </Card>
        );
    }
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
            <div class="profile">
                <img src={user.photoURL} width="40" height="40" alt="profile" />
                <div class="account">
                    <p>{user.displayName}</p>
                    <p class="email">{user.email}</p>
                </div>
                <Button onClick={() => app.googleLogout()}>Logout</Button>
            </div>
        );
    }
}


function ClassroomTable({ data }) {
    return (
        <Table striped bordered hover responsive>
            <thead>
                <tr>
                    <th>รหัสวิชา</th>
                    <th>ชื่อวิชา</th>
                    <th>ห้องเรียน</th>
                    <th>ผู้สอน</th>
                </tr>
            </thead>
            <tbody>
                {data.map((classroom) => (
                    <tr key={classroom.cid}>
                        <td>{classroom.info.code}</td>
                        <td>{classroom.info.name}</td>
                        <td>{classroom.info.room}</td>
                        <td>{classroom.ownerName}</td>
                    </tr>
                ))}
            </tbody>
        </Table>
    );
}

function ClassroomCards({ data, onEditClick }) {
    return (
        <div className="row">
            {data.map((classroom) => (
                <div key={classroom.id} className="col-md-3 mb-4 d-flex align-items-stretch">
                    <Card>
                        <Card.Img
                            variant="top"
                            className="card-img"
                            src={classroom.info.photo}
                        />
                        <Card.Body>
                            <Card.Title>{classroom.info.name}</Card.Title>
                            <button
                                className="btn btn-light position-absolute top-0 end-0 m-3"
                                onClick={() => onEditClick(classroom)} // ส่งข้อมูลห้องเรียนไปยังฟังก์ชัน handleEditClick
                            >
                                <i className="fas fa-ellipsis-h"></i>
                            </button>
                            <Card.Subtitle className="mb-2 text-muted">รหัสวิชา: {classroom.info.code}</Card.Subtitle>
                            <Card.Text>
                                <strong>ห้องเรียน:</strong> {classroom.info.room} <br />
                                {classroom.ownerName}
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

function EditButton({ std, app }) {
    return (
        <button class="actionBtn" onClick={() => app.edit(std)}>
            <i class="fa-regular fa-pen-to-square"></i> แก้ไข
        </button>
    );
}

function DeleteButton({ std, app }) {
    return (
        <button class="actionBtn" onClick={() => app.delete(std)}>
            <i class="far fa-trash-alt"></i> ลบ
        </button>
    );
}

const container = document.getElementById("myapp");
const root = ReactDOM.createRoot(container);
root.render(<App />);
