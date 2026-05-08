require('dotenv').config();
const express = require('express');
const sql = require('mssql/msnodesqlv8');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const config = {
  connectionString: "Driver={ODBC Driver 17 for SQL Server};Server=localhost;Database=project1;Trusted_Connection=yes;",
};

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => { console.log('Connected to MSSQL'); return pool; })
  .catch(err => console.log('Database Connection Failed!', err));

// Authentication (VerifyUserLogin expects @Username)
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const pool = await poolPromise;
    const result = await pool.request()
      .input('Username', sql.VarChar, username)
      .input('Password', sql.VarChar, password)
      .query(`
        SELECT UserID, StudentID, FacultyID,
          CASE 
            WHEN StudentID IS NOT NULL THEN 'Student'
            WHEN FacultyID IS NOT NULL THEN 'Faculty'
            ELSE 'Admin'
          END AS Role
        FROM Users 
        WHERE Username = @Username AND PasswordHash = @Password AND IsActive = 1
      `);
    if (result.recordset.length > 0) {
      const rec = result.recordset[0];
      const user = {
        userId: rec.UserID,
        role: rec.Role,
        studentId: rec.StudentID,
        facultyId: rec.FacultyID,
      };
      res.json(user);
    } else res.status(401).json({ message: 'Incorrect username or password.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// Courses
app.get('/api/courses', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT CourseID, CourseCode, CourseName, CreditHours, DepartmentID FROM Courses');
    res.json(result.recordset);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/courses', async (req, res) => {
  try {
    const { CourseCode, CourseName, CreditHours, DepartmentID } = req.body;
    const pool = await poolPromise;
    await pool.request()
      .input('CourseCode', sql.VarChar, CourseCode)
      .input('CourseName', sql.VarChar, CourseName)
      .input('CreditHours', sql.Int, CreditHours)
      .input('DepartmentID', sql.Int, DepartmentID)
      .execute('AddCourse');
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/courses/:id', async (req, res) => {
  try {
    const courseId = parseInt(req.params.id, 10);
    const { CourseName } = req.body;
    const pool = await poolPromise;
    await pool.request().input('CourseID', sql.Int, courseId).input('NewName', sql.VarChar, CourseName).execute('EditCourse');
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/courses/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const pool = await poolPromise;
    await pool.request().query('DELETE FROM Courses WHERE CourseID = ' + id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Classrooms
app.get('/api/classrooms', async (req, res) => {
  try { const pool = await poolPromise; const result = await pool.request().query('SELECT RoomID, RoomName, Capacity, RoomType, IsActive FROM Rooms'); res.json(result.recordset); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/classrooms', async (req, res) => {
  try {
    const { RoomName, Capacity, RoomType } = req.body;
    const pool = await poolPromise;
    await pool.request().input('RoomName', sql.VarChar, RoomName).input('Capacity', sql.Int, Capacity).input('RoomType', sql.VarChar, RoomType).execute('AddClassroom');
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/classrooms/:id', async (req, res) => {
  try { const id = parseInt(req.params.id, 10); const pool = await poolPromise; await pool.request().input('RoomID', sql.Int, id).execute('DeactivateClassroom'); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); }
});

// Faculty
app.get('/api/faculty', async (req, res) => {
  try { const pool = await poolPromise; const result = await pool.request().query('SELECT FacultyID, FullName, Email, DepartmentID, IsActive FROM Faculty'); res.json(result.recordset); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/faculty', async (req, res) => {
  try {
    const { FullName, Email, DeptID, Username, PasswordHash } = req.body;
    const pool = await poolPromise;
    await pool.request()
      .input('FullName', sql.VarChar, FullName)
      .input('Email', sql.VarChar, Email)
      .input('DeptID', sql.Int, DeptID)
      .input('Username', sql.VarChar, Username)
      .input('PasswordHash', sql.VarChar, PasswordHash || 'no_password')
      .execute('RegisterFaculty');
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/faculty/:id', async (req, res) => { try { const id = parseInt(req.params.id, 10); const pool = await poolPromise; await pool.request().input('FacultyID', sql.Int, id).execute('DeactivateFaculty'); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); } });

// Students
app.get('/api/students', async (req, res) => { try { const pool = await poolPromise; const result = await pool.request().query('SELECT StudentID, RollNumber, FullName, SectionID FROM Students'); res.json(result.recordset); } catch (err) { res.status(500).json({ error: err.message }); } });
app.get('/api/student/:id', async (req, res) => { try { const id = parseInt(req.params.id,10); const pool = await poolPromise; const result = await pool.request().query('SELECT * FROM Students WHERE StudentID = ' + id); res.json(result.recordset[0]); } catch (err) { res.status(500).json({ error: err.message }); } });
app.post('/api/students', async (req, res) => {
  try {
    const { RollNum, FullName, SecID, Username, PasswordHash } = req.body;
    const pool = await poolPromise;
    await pool.request()
      .input('RollNum', sql.VarChar, RollNum)
      .input('FullName', sql.VarChar, FullName)
      .input('SecID', sql.Int, SecID)
      .input('Username', sql.VarChar, Username)
      .input('PasswordHash', sql.VarChar, PasswordHash || 'no_password')
      .execute('RegisterStudent');
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/students/:id/section', async (req, res) => { try { const id = parseInt(req.params.id,10); const { NewSectionID } = req.body; const pool = await poolPromise; await pool.request().input('StudentID', sql.Int, id).input('NewSectionID', sql.Int, NewSectionID).execute('UpdateStudentSection'); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); } });

// Timetable: create entry and reschedule

app.get('/api/timeslots', async (req, res) => { try { const pool = await poolPromise; const result = await pool.request().query('SELECT SlotID, DayOfWeek, StartTime, EndTime FROM TimeSlots ORDER BY SlotID'); res.json(result.recordset); } catch (err) { res.status(500).json({ error: err.message }); } });
app.post('/api/timetable', async (req, res) => {
  try {
    const { OfferingID, RoomID, SlotID } = req.body;
    const pool = await poolPromise;
    await pool.request().input('OfferingID', sql.Int, OfferingID).input('RoomID', sql.Int, RoomID).input('SlotID', sql.Int, SlotID).query('INSERT INTO Timetable (OfferingID, RoomID, SlotID) VALUES (@OfferingID,@RoomID,@SlotID)');
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/timetable/:entryId/reschedule', async (req, res) => { try { const entryId = parseInt(req.params.entryId,10); const { NewRoomID, NewSlotID } = req.body; const pool = await poolPromise; await pool.request().input('EntryID', sql.Int, entryId).input('NewRoomID', sql.Int, NewRoomID).input('NewSlotID', sql.Int, NewSlotID).execute('RescheduleClass'); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); } });

// Conflicts / export / reports

app.get('/api/export', async (req, res) => { try { const pool = await poolPromise; const result = await pool.request().query('SELECT t.EntryID, co.AcademicYear, d.DepartmentName, s.Semester, s.SectionName, c.CourseCode, c.CourseName, f.FullName AS FacultyName, r.RoomName, ts.DayOfWeek, ts.StartTime FROM Timetable t JOIN CourseOfferings co ON t.OfferingID = co.OfferingID JOIN Sections s ON co.SectionID = s.SectionID JOIN Departments d ON s.DepartmentID = d.DepartmentID JOIN Courses c ON co.CourseID = c.CourseID JOIN Faculty f ON co.FacultyID = f.FacultyID JOIN Rooms r ON t.RoomID = r.RoomID JOIN TimeSlots ts ON t.SlotID = ts.SlotID ORDER BY t.EntryID DESC'); res.json(result.recordset); } catch (err) { res.status(500).json({ error: err.message }); } });
app.get('/api/reports/departments', async (req, res) => { try { const pool = await poolPromise; const result = await pool.request().query(`SELECT d.DepartmentName, COUNT(DISTINCT c.CourseID) AS CourseCount, COUNT(DISTINCT f.FacultyID) AS FacultyCount FROM Departments d LEFT JOIN Courses c ON d.DepartmentID = c.DepartmentID LEFT JOIN Faculty f ON d.DepartmentID = f.DepartmentID GROUP BY d.DepartmentName`); res.json(result.recordset); } catch (err) { res.status(500).json({ error: err.message }); } });

// Faculty-specific
app.get('/api/faculty-schedule/:facultyId', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().input('FacultyID', sql.Int, req.params.facultyId).execute('GetFacultySchedule');
    res.json(result.recordset);
  } catch (err) { res.status(500).json({ error: err.message }); }
});


// Student timetable by roll
app.get('/api/student-timetable/:roll', async (req, res) => { try { const pool = await poolPromise; const result = await pool.request().input('RollNumber', sql.VarChar, req.params.roll).execute('GetStudentTimetable'); res.json(result.recordset); } catch (err) { res.status(500).json({ error: err.message }); } });



// Offerings helper
app.get('/api/offerings/details', async (req, res) => { try { const pool = await poolPromise; const result = await pool.request().query('SELECT co.OfferingID, c.CourseName, c.CourseCode, f.FullName AS FacultyName, s.SectionName, co.AcademicYear FROM CourseOfferings co JOIN Courses c ON co.CourseID = c.CourseID JOIN Faculty f ON co.FacultyID = f.FacultyID JOIN Sections s ON co.SectionID = s.SectionID'); res.json(result.recordset); } catch (err) { res.status(500).json({ error: err.message }); } });

// Departments / Sections
app.get('/api/departments', async (req, res) => { try { const pool = await poolPromise; const result = await pool.request().query('SELECT DepartmentID, DepartmentName FROM Departments'); res.json(result.recordset); } catch (err) { res.status(500).json({ error: err.message }); } });
app.get('/api/sections', async (req, res) => { try { const pool = await poolPromise; const result = await pool.request().query('SELECT SectionID, SectionName, Semester, DepartmentID FROM Sections'); res.json(result.recordset); } catch (err) { res.status(500).json({ error: err.message }); } });



app.listen(3000, () => console.log('Server running on port 3000'));
