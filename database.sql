-- ==========================================
-- 1. DATABASE SCHEMA 
-- ==========================================
USE project1;
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- Drop all views
DECLARE @sql VARCHAR(MAX) = '';
SELECT @sql = @sql + 'DROP VIEW ' + name + ';' FROM sys.views;
EXEC (@sql);
GO

-- Drop all procedures
DECLARE @sql VARCHAR(MAX) = '';
SELECT @sql = @sql + 'DROP PROCEDURE ' + name + ';' FROM sys.procedures;
EXEC (@sql);
GO

-- Drop all triggers
DECLARE @sql VARCHAR(MAX) = '';
SELECT @sql = @sql + 'DROP TRIGGER ' + name + ';' FROM sys.triggers;
EXEC (@sql);
GO

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS Timetable;
DROP TABLE IF EXISTS CourseOfferings;
DROP TABLE IF EXISTS Users;
DROP TABLE IF EXISTS Students;
DROP TABLE IF EXISTS Sections;
DROP TABLE IF EXISTS Faculty;
DROP TABLE IF EXISTS Courses;
DROP TABLE IF EXISTS TimeSlots;
DROP TABLE IF EXISTS Rooms;
DROP TABLE IF EXISTS Departments;
GO

CREATE TABLE Departments (
    DepartmentID INT IDENTITY(1,1) PRIMARY KEY,
    DepartmentName VARCHAR(100) NOT NULL UNIQUE,
    DepartmentCode CHAR(5) NOT NULL UNIQUE
);

CREATE TABLE Rooms (
    RoomID INT IDENTITY(1,1) PRIMARY KEY,
    RoomName VARCHAR(20) NOT NULL UNIQUE,
    Capacity INT NOT NULL CHECK (Capacity > 0),
    RoomType VARCHAR(20) NOT NULL CHECK (RoomType IN ('Lecture', 'Lab', 'Seminar')),
    IsActive BIT NOT NULL DEFAULT 1
);

CREATE TABLE TimeSlots (
    SlotID INT IDENTITY(1,1) PRIMARY KEY,
    DayOfWeek VARCHAR(10) NOT NULL CHECK (DayOfWeek IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday')),
    StartTime TIME NOT NULL,
    EndTime TIME NOT NULL,
    CHECK (EndTime > StartTime), 
    UNIQUE (DayOfWeek, StartTime)
);

CREATE TABLE Courses (
    CourseID INT IDENTITY(1,1) PRIMARY KEY,
    CourseCode VARCHAR(10) NOT NULL UNIQUE,
    CourseName VARCHAR(100) NOT NULL,
    CreditHours INT NOT NULL CHECK (CreditHours BETWEEN 1 AND 4),
    DepartmentID INT NOT NULL,
    FOREIGN KEY (DepartmentID) REFERENCES Departments(DepartmentID)
);

CREATE TABLE Sections (
    SectionID INT IDENTITY(1,1) PRIMARY KEY,
    SectionName CHAR(1) NOT NULL CHECK (SectionName IN ('A','B','C','D')),
    Semester INT NOT NULL CHECK (Semester BETWEEN 1 AND 8),
    DepartmentID INT NOT NULL,
    FOREIGN KEY (DepartmentID) REFERENCES Departments(DepartmentID),
    UNIQUE (SectionName, Semester, DepartmentID)
);

CREATE TABLE Faculty (
    FacultyID INT IDENTITY(1,1) PRIMARY KEY,
    FullName VARCHAR(100) NOT NULL,
    Email VARCHAR(100) NOT NULL UNIQUE,
    DepartmentID INT NOT NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    FOREIGN KEY (DepartmentID) REFERENCES Departments(DepartmentID)
);

CREATE TABLE Students (
    StudentID INT IDENTITY(1,1) PRIMARY KEY,
    RollNumber VARCHAR(20) NOT NULL UNIQUE,
    FullName VARCHAR(100) NOT NULL,
    SectionID INT NOT NULL,
    FOREIGN KEY (SectionID) REFERENCES Sections(SectionID)
);

CREATE TABLE CourseOfferings (
    OfferingID INT IDENTITY(1,1) PRIMARY KEY,
    CourseID INT NOT NULL,
    FacultyID INT NOT NULL,
    SectionID INT NOT NULL,
    AcademicYear CHAR(9) NOT NULL,
    FOREIGN KEY (CourseID) REFERENCES Courses(CourseID),
    FOREIGN KEY (FacultyID) REFERENCES Faculty(FacultyID),
    FOREIGN KEY (SectionID) REFERENCES Sections(SectionID),
    UNIQUE (CourseID, SectionID, AcademicYear)
);

CREATE TABLE Timetable (
    EntryID INT IDENTITY(1,1) PRIMARY KEY,
    OfferingID INT NOT NULL,
    RoomID INT NOT NULL,
    SlotID INT NOT NULL,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (OfferingID) REFERENCES CourseOfferings(OfferingID),
    FOREIGN KEY (RoomID) REFERENCES Rooms(RoomID),
    FOREIGN KEY (SlotID) REFERENCES TimeSlots(SlotID),
    UNIQUE (RoomID, SlotID),
    UNIQUE (OfferingID, SlotID) 
);

CREATE TABLE Users (
    UserID INT IDENTITY(1,1) PRIMARY KEY,
    Username VARCHAR(50) NOT NULL UNIQUE,
    PasswordHash VARCHAR(255) NOT NULL,
    StudentID INT NULL,
    FacultyID INT NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    FOREIGN KEY (StudentID) REFERENCES Students(StudentID),
    FOREIGN KEY (FacultyID) REFERENCES Faculty(FacultyID),
    CHECK (
        (StudentID IS NOT NULL AND FacultyID IS NULL) OR 
        (StudentID IS NULL AND FacultyID IS NOT NULL) OR
        (StudentID IS NULL AND FacultyID IS NULL)
    )
);
GO

-- Filtered Indexes for BCNF on SQL Server
CREATE UNIQUE INDEX UQ_Users_StudentID ON Users(StudentID) WHERE StudentID IS NOT NULL;
CREATE UNIQUE INDEX UQ_Users_FacultyID ON Users(FacultyID) WHERE FacultyID IS NOT NULL;
GO


-- ==========================================
-- 2. PROCEDURES & VIEWS
-- ==========================================

-- 1. Role-Based Login System 
CREATE PROCEDURE VerifyUserLogin 
    @Username VARCHAR(50) 
AS 
BEGIN
    SELECT 
        UserID, 
        StudentID, 
        FacultyID,
        CASE 
            WHEN StudentID IS NOT NULL THEN 'Student'
            WHEN FacultyID IS NOT NULL THEN 'Faculty'
            ELSE 'Admin'
        END AS Role
    FROM Users 
    WHERE Username = @Username 
      AND IsActive = 1;
END;
GO

-- 2. Global Search
CREATE PROCEDURE GlobalSearch 
    @Query VARCHAR(100) 
AS 
BEGIN
    SELECT FullName AS ResultName, 'Faculty' AS Type 
    FROM Faculty 
    WHERE FullName LIKE '%' + @Query + '%' 
    UNION 
    SELECT CourseName AS ResultName, 'Course' AS Type 
    FROM Courses 
    WHERE CourseName LIKE '%' + @Query + '%';
END;
GO

-- 3. Add New Course
CREATE PROCEDURE AddCourse 
    @CourseCode VARCHAR(10), 
    @CourseName VARCHAR(100), 
    @CreditHours INT, 
    @DepartmentID INT 
AS 
BEGIN
    INSERT INTO Courses (CourseCode, CourseName, CreditHours, DepartmentID) 
    VALUES (@CourseCode, @CourseName, @CreditHours, @DepartmentID);
END;
GO

-- 4. View Courses
CREATE VIEW vw_AllCourses AS 
SELECT 
    c.CourseCode, 
    c.CourseName, 
    c.CreditHours, 
    d.DepartmentName 
FROM Courses c 
JOIN Departments d ON c.DepartmentID = d.DepartmentID;
GO

-- 5. Edit Course
CREATE PROCEDURE EditCourse 
    @CourseID INT, 
    @NewName VARCHAR(100) 
AS 
BEGIN
    UPDATE Courses 
    SET CourseName = @NewName 
    WHERE CourseID = @CourseID;
END;
GO

-- 6. Register New Classroom
CREATE PROCEDURE AddClassroom 
    @RoomName VARCHAR(20), 
    @Capacity INT, 
    @RoomType VARCHAR(20) 
AS 
BEGIN
    INSERT INTO Rooms (RoomName, Capacity, RoomType) 
    VALUES (@RoomName, @Capacity, @RoomType);
END;
GO

-- 7. View Classrooms
CREATE VIEW vw_AllClassrooms AS 
SELECT RoomID, RoomName, Capacity, RoomType 
FROM Rooms 
WHERE IsActive = 1;
GO

-- 8. Edit/Delete Classroom (Soft Delete)
CREATE PROCEDURE DeactivateClassroom 
    @RoomID INT 
AS 
BEGIN
    UPDATE Rooms 
    SET IsActive = 0 
    WHERE RoomID = @RoomID;
END;
GO

-- 9. Register Faculty Member
CREATE PROCEDURE RegisterFaculty 
    @FullName VARCHAR(100), 
    @Email VARCHAR(100), 
    @DeptID INT, 
    @Username VARCHAR(50), 
    @PasswordHash VARCHAR(255) 
AS 
BEGIN
    BEGIN TRY 
        BEGIN TRAN; 
        DECLARE @NewFacID INT; 
        
        INSERT INTO Faculty (FullName, Email, DepartmentID) 
        VALUES (@FullName, @Email, @DeptID); 
        
        SET @NewFacID = SCOPE_IDENTITY(); 
        
        INSERT INTO Users (Username, PasswordHash, FacultyID) 
        VALUES (@Username, @PasswordHash, @NewFacID); 
        
        COMMIT TRAN; 
    END TRY 
    BEGIN CATCH 
        ROLLBACK TRAN; 
    END CATCH;
END;
GO

-- 10. View Faculty Roster
CREATE VIEW vw_FacultyRoster AS 
SELECT 
    f.FacultyID, 
    f.FullName, 
    f.Email, 
    d.DepartmentName 
FROM Faculty f 
JOIN Departments d ON f.DepartmentID = d.DepartmentID 
WHERE f.IsActive = 1;
GO

-- 11. Edit/Delete Faculty (Soft Delete)
CREATE PROCEDURE DeactivateFaculty 
    @FacultyID INT 
AS 
BEGIN
    UPDATE Faculty 
    SET IsActive = 0 
    WHERE FacultyID = @FacultyID;
END;
GO

-- 12. Change Time Slots / Reschedule
CREATE PROCEDURE RescheduleClass 
    @EntryID INT, 
    @NewRoomID INT, 
    @NewSlotID INT 
AS 
BEGIN
    UPDATE Timetable 
    SET RoomID = @NewRoomID, SlotID = @NewSlotID 
    WHERE EntryID = @EntryID;
END;
GO

-- 13. Conflict Detection Dashboard
CREATE VIEW vw_ConflictDashboard AS 
SELECT 
    r.RoomName, 
    ts.DayOfWeek, 
    ts.StartTime 
FROM Timetable t 
JOIN Rooms r ON t.RoomID = r.RoomID 
JOIN TimeSlots ts ON t.SlotID = ts.SlotID 
WHERE t.SlotID IN (
    SELECT SlotID 
    FROM Timetable 
    GROUP BY SlotID, RoomID 
    HAVING COUNT(EntryID) > 1
);
GO

-- 14. Fix Overlap Tool / Automated Conflict Prevention
CREATE TRIGGER trg_PreventDoubleBooking 
ON Timetable 
AFTER INSERT, UPDATE 
AS 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM inserted i 
        JOIN Timetable t ON i.RoomID = t.RoomID AND i.SlotID = t.SlotID 
        WHERE i.EntryID <> t.EntryID
    ) 
    BEGIN 
        RAISERROR ('Room is already booked for this timeslot!', 16, 1); 
        ROLLBACK TRANSACTION; 
    END;
END;
GO

-- 15. View Personal Schedule for Faculty
CREATE PROCEDURE GetFacultySchedule 
    @FacultyID INT 
AS 
BEGIN
    SELECT 
        c.CourseName, 
        s.SectionName, 
        r.RoomName, 
        ts.DayOfWeek, 
        ts.StartTime, 
        ts.EndTime 
    FROM Timetable t 
    JOIN CourseOfferings co ON t.OfferingID = co.OfferingID 
    JOIN Courses c ON co.CourseID = c.CourseID 
    JOIN Sections s ON co.SectionID = s.SectionID 
    JOIN Rooms r ON t.RoomID = r.RoomID 
    JOIN TimeSlots ts ON t.SlotID = ts.SlotID 
    WHERE co.FacultyID = @FacultyID;
END;
GO

-- 16. Availability Planning View
CREATE PROCEDURE GetFacultyFreeSlots 
    @FacultyID INT 
AS 
BEGIN
    SELECT SlotID, DayOfWeek, StartTime, EndTime 
    FROM TimeSlots 
    EXCEPT 
    SELECT ts.SlotID, ts.DayOfWeek, ts.StartTime, ts.EndTime 
    FROM Timetable t 
    JOIN CourseOfferings co ON t.OfferingID = co.OfferingID 
    JOIN TimeSlots ts ON t.SlotID = ts.SlotID 
    WHERE co.FacultyID = @FacultyID;
END;
GO

-- 17. Search/View by Roll Number
CREATE PROCEDURE GetStudentTimetable 
    @RollNumber VARCHAR(20) 
AS 
BEGIN
    SELECT 
        c.CourseName, 
        f.FullName AS Instructor, 
        r.RoomName, 
        ts.DayOfWeek, 
        ts.StartTime, 
        ts.EndTime 
    FROM Students st 
    JOIN Sections s ON st.SectionID = s.SectionID 
    JOIN CourseOfferings co ON s.SectionID = co.SectionID 
    JOIN Timetable t ON co.OfferingID = t.OfferingID 
    JOIN Courses c ON co.CourseID = c.CourseID 
    JOIN Faculty f ON co.FacultyID = f.FacultyID 
    JOIN Rooms r ON t.RoomID = r.RoomID 
    JOIN TimeSlots ts ON t.SlotID = ts.SlotID 
    WHERE st.RollNumber = @RollNumber;
END;
GO

-- 18. Search/View by Section
CREATE PROCEDURE GetSectionTimetable 
    @SectionName CHAR(1), 
    @Semester INT 
AS 
BEGIN
    SELECT 
        c.CourseName, 
        r.RoomName, 
        ts.DayOfWeek, 
        ts.StartTime 
    FROM Timetable t 
    JOIN CourseOfferings co ON t.OfferingID = co.OfferingID 
    JOIN Courses c ON co.CourseID = c.CourseID 
    JOIN Rooms r ON t.RoomID = r.RoomID 
    JOIN TimeSlots ts ON t.SlotID = ts.SlotID 
    JOIN Sections s ON co.SectionID = s.SectionID 
    WHERE s.SectionName = @SectionName AND s.Semester = @Semester;
END;
GO

-- 19. Download Timetable Data
CREATE VIEW vw_ExportTimetable AS 
SELECT 
    co.AcademicYear, 
    d.DepartmentName, 
    s.Semester, 
    s.SectionName, 
    c.CourseCode, 
    r.RoomName, 
    ts.DayOfWeek, 
    ts.StartTime 
FROM Timetable t 
JOIN CourseOfferings co ON t.OfferingID = co.OfferingID 
JOIN Sections s ON co.SectionID = s.SectionID 
JOIN Departments d ON s.DepartmentID = d.DepartmentID 
JOIN Courses c ON co.CourseID = c.CourseID 
JOIN Rooms r ON t.RoomID = r.RoomID 
JOIN TimeSlots ts ON t.SlotID = ts.SlotID;
GO

-- 20. Register New Student
CREATE PROCEDURE RegisterStudent 
    @RollNum VARCHAR(20), 
    @FullName VARCHAR(100), 
    @SecID INT, 
    @Username VARCHAR(50), 
    @PasswordHash VARCHAR(255) 
AS 
BEGIN
    BEGIN TRY 
        BEGIN TRAN; 
        DECLARE @NewStdID INT; 
        
        INSERT INTO Students (RollNumber, FullName, SectionID) 
        VALUES (@RollNum, @FullName, @SecID); 
        
        SET @NewStdID = SCOPE_IDENTITY(); 
        
        INSERT INTO Users (Username, PasswordHash, StudentID) 
        VALUES (@Username, @PasswordHash, @NewStdID); 
        
        COMMIT TRAN; 
    END TRY 
    BEGIN CATCH 
        ROLLBACK TRAN; 
    END CATCH;
END;
GO

-- 21. View Student Directory
CREATE VIEW vw_StudentDirectory AS 
SELECT 
    st.RollNumber, 
    st.FullName, 
    s.Semester, 
    s.SectionName 
FROM Students st 
JOIN Sections s ON st.SectionID = s.SectionID 
ORDER BY st.RollNumber ASC 
OFFSET 0 ROWS;
GO

-- 22. Edit/Remove Student
CREATE PROCEDURE UpdateStudentSection 
    @StudentID INT, 
    @NewSectionID INT 
AS 
BEGIN
    UPDATE Students 
    SET SectionID = @NewSectionID 
    WHERE StudentID = @StudentID;
END;
GO


-- ==========================================
-- 3. SEED DATA
-- ==========================================

INSERT INTO Departments (DepartmentName, DepartmentCode) VALUES 
('Artificial Intelligence', 'AI005'), ('Cyber Security', 'CY006'),
('Data Science', 'DS007'), ('Civil Engineering', 'CE008'),
('Mechanical Engineering', 'ME009'), ('Mathematics', 'MT010'),
('Physics', 'PH011'), ('Humanities', 'HU012');

INSERT INTO Rooms (RoomName, Capacity, RoomType) VALUES 
('CR-103', 50, 'Lecture'), ('CR-104', 50, 'Lecture'),
('CR-105', 60, 'Lecture'), ('CR-202', 60, 'Lecture'),
('CR-203', 60, 'Lecture'), ('CR-204', 45, 'Lecture'),
('CR-301', 45, 'Lecture'), ('CR-302', 45, 'Lecture'),
('CR-303', 45, 'Lecture'), ('CR-304', 45, 'Lecture'),
('CR-401', 50, 'Lecture'), ('CR-402', 50, 'Lecture'),
('Lab-C', 35, 'Lab'), ('Lab-D', 35, 'Lab'),
('Lab-E', 30, 'Lab'), ('Lab-F', 30, 'Lab'),
('Lab-G', 40, 'Lab'), ('Lab-H', 40, 'Lab'),
('Seminar-2', 150, 'Seminar'), ('Auditorium', 300, 'Seminar'),
('Meeting-1', 15, 'Lecture');

INSERT INTO TimeSlots (DayOfWeek, StartTime, EndTime) VALUES 
('Monday', '17:00:00', '18:20:00'), ('Monday', '18:30:00', '19:50:00'),
('Tuesday', '17:00:00', '18:20:00'), ('Tuesday', '18:30:00', '19:50:00'),
('Wednesday', '17:00:00', '18:20:00'), ('Wednesday', '18:30:00', '19:50:00'),
('Thursday', '17:00:00', '18:20:00'), ('Thursday', '18:30:00', '19:50:00'),
('Friday', '11:30:00', '12:50:00'), ('Friday', '14:30:00', '15:50:00'),
('Friday', '16:00:00', '17:20:00'), ('Saturday', '09:00:00', '12:00:00'),
('Saturday', '13:00:00', '16:00:00');

INSERT INTO Courses (CourseCode, CourseName, CreditHours, DepartmentID) VALUES 
('CS201', 'Data Structures', 4, 1), ('CS202', 'Design and Analysis of Algorithms', 3, 1),
('CS304', 'Computer Networks', 3, 1), ('CS306', 'Theory of Automata', 3, 1),
('CS401', 'Artificial Intelligence', 3, 5), ('CS405', 'Machine Learning', 3, 5),
('CS408', 'Computer Architecture', 3, 1), ('CY201', 'Intro to Cyber Security', 3, 6),
('CY302', 'Digital Forensics', 3, 6), ('CY401', 'Network Security', 3, 6),
('DS201', 'Data Mining', 3, 7), ('DS301', 'Big Data Analytics', 3, 7),
('EE301', 'Signals and Systems', 3, 2), ('EE402', 'Control Systems', 3, 2),
('EE201', 'Basic Electronics', 4, 2), ('SE302', 'Software Quality Assurance', 3, 3),
('SE401', 'Software Project Management', 3, 3), ('SE301', 'Software Design and Architecture', 3, 3),
('MG201', 'Marketing Management', 3, 4), ('MG301', 'Financial Accounting', 3, 4),
('MT201', 'Linear Algebra', 3, 6), ('MT202', 'Differential Equations', 3, 6),
('MT204', 'Numerical Computing', 3, 6), ('SS101', 'Islamic Studies', 2, 8),
('SS102', 'Pakistan Studies', 2, 8), ('SS103', 'Communication Skills', 3, 8),
('PH101', 'Applied Physics', 4, 7);

INSERT INTO Sections (SectionName, Semester, DepartmentID) VALUES 
('D', 3, 1), ('A', 4, 1), ('B', 4, 1), ('A', 5, 1), ('B', 5, 1), ('C', 5, 1), 
('A', 7, 1), ('B', 7, 1), ('C', 7, 1), ('B', 3, 3), ('C', 3, 3), ('A', 5, 3), 
('B', 5, 3), ('A', 7, 3), ('A', 3, 5), ('B', 3, 5), ('A', 5, 5), ('B', 5, 5),
('A', 3, 6), ('B', 3, 6), ('A', 5, 6), ('A', 3, 7), ('B', 3, 7), ('A', 5, 7),
('B', 2, 2), ('C', 2, 2), ('A', 4, 2), ('B', 4, 2), ('A', 2, 4), ('B', 2, 4), 
('A', 4, 4);

INSERT INTO Faculty (FullName, Email, DepartmentID, IsActive) VALUES 
('Dr. Muhammad Awais', 'muhammad.awais@nu.edu.pk', 1, 1), ('Dr. Kashif Zafar', 'kashif.zafar@nu.edu.pk', 5, 1),
('Dr. Asif Mahmood', 'asif.mahmood@nu.edu.pk', 1, 1), ('Ms. Amna Tariq', 'amna.tariq@nu.edu.pk', 3, 1),
('Mr. Saad Salman', 'saad.salman@nu.edu.pk', 1, 1), ('Dr. Zulfiqar Habib', 'zulfiqar.habib@nu.edu.pk', 6, 1),
('Dr. Omer Saleemi', 'omer.saleemi@nu.edu.pk', 2, 1), ('Ms. Nida Anwar', 'nida.anwar@nu.edu.pk', 6, 1),
('Dr. Ali Afzal', 'ali.afzal@nu.edu.pk', 7, 1), ('Mr. Bilal Khalid', 'bilal.khalid@nu.edu.pk', 1, 1),
('Dr. Sadia Majid', 'sadia.majid@nu.edu.pk', 4, 1), ('Ms. Farwa Batool', 'farwa.batool@nu.edu.pk', 3, 1),
('Dr. Imran Ali', 'imran.ali@nu.edu.pk', 5, 1), ('Mr. Hammad Raza', 'hammad.raza@nu.edu.pk', 1, 1),
('Dr. Taimoor Khan', 'taimoor.khan@nu.edu.pk', 6, 1), ('Dr. Waseem Shahzad', 'waseem.shahzad@nu.edu.pk', 1, 1),
('Ms. Kiran Ijaz', 'kiran.ijaz@nu.edu.pk', 8, 1), ('Mr. Adeel Mumtaz', 'adeel.mumtaz@nu.edu.pk', 2, 1),
('Dr. Faizan Ahmad', 'faizan.ahmad@nu.edu.pk', 7, 1), ('Ms. Sana Jamil', 'sana.jamil@nu.edu.pk', 5, 1);

INSERT INTO Students (RollNumber, FullName, SectionID) VALUES
('24L-0534', 'Ahmad Ali', 1), ('24L-0535', 'Zain Tariq', 2), ('24L-0536', 'Usman Ghani', 3), 
('24L-0537', 'Talha Mehmood', 4), ('24L-0538', 'Faizan Ali', 5), ('24L-0539', 'Hamza Naveed', 6),
('24L-0540', 'Abdul Rehman', 7), ('23L-1101', 'Hamza Khan', 8), ('23L-1102', 'Saad Qureshi', 9), 
('23L-1103', 'Aliya Shah', 10), ('23L-1104', 'Mahnoor Fatima', 11), ('23L-1105', 'Iqra Mubeen', 12),
('23L-1106', 'Rida Zainab', 13), ('23L-1107', 'Maha Aslam', 14), ('22L-2201', 'Danish Ali', 15), 
('22L-2202', 'Rehan Jamil', 16), ('22L-2203', 'Kashif Mehmood', 17), ('22L-2204', 'Asad Shafiq', 18),
('22L-2205', 'Nabeel Ahmed', 19), ('24L-3301', 'Noman Ijaz', 20), ('24L-3302', 'Sohail Abbas', 21), 
('24L-3303', 'Yasir Hameed', 22), ('23L-4401', 'Ayesha Malik', 23), ('23L-4402', 'Nimra Saleem', 24),
('23L-4403', 'Fahad Mustafa', 25), ('23L-4404', 'Ahsan Khan', 26), ('22L-5501', 'Waqas Ahmed', 27), 
('22L-5502', 'Taha Rahman', 28), ('22L-5503', 'Shahid Afridi', 29), ('24L-6601', 'Zohaib Hassan', 30),
('24L-6602', 'Muneeb Butt', 31), ('24L-6603', 'Hassan Ali', 31), ('24L-7701', 'Kamran Akmal', 30), 
('24L-7702', 'Babar Azam', 29), ('24L-7703', 'Shaheen Afridi', 28), ('24L-7704', 'Rizwan Ahmed', 27);

INSERT INTO Users (Username, PasswordHash, StudentID, FacultyID) VALUES
('mawais', 'hashed_pwd_fac', NULL, 1), ('kzafar', 'hashed_pwd_fac', NULL, 2),
('amahmood', 'hashed_pwd_fac', NULL, 3), ('atariq', 'hashed_pwd_fac', NULL, 4),
('ssalman', 'hashed_pwd_fac', NULL, 5), ('24l0534', 'hashed_pwd_std', 1, NULL),
('24l0535', 'hashed_pwd_std', 2, NULL), ('23l1101', 'hashed_pwd_std', 8, NULL),
('23l1102', 'hashed_pwd_std', 9, NULL), ('22l2201', 'hashed_pwd_std', 15, NULL),
('22l2202', 'hashed_pwd_std', 16, NULL), ('24l3301', 'hashed_pwd_std', 20, NULL),
('23l4401', 'hashed_pwd_std', 23, NULL), ('22l5501', 'hashed_pwd_std', 27, NULL),
('24l7701', 'hashed_pwd_std', 33, NULL), 
('admin1', 'hashed_pwd_admin', NULL, NULL);

INSERT INTO CourseOfferings (CourseID, FacultyID, SectionID, AcademicYear) VALUES
(1, 1, 1, '2025-2026'), (2, 2, 2, '2025-2026'), (3, 3, 3, '2025-2026'), (4, 4, 4, '2025-2026'),
(5, 5, 5, '2025-2026'), (6, 6, 6, '2025-2026'), (7, 7, 7, '2025-2026'), (8, 8, 8, '2025-2026'),
(9, 9, 9, '2025-2026'), (10, 10, 10, '2025-2026'), (11, 11, 11, '2025-2026'), (12, 12, 12, '2025-2026'),
(13, 13, 13, '2025-2026'), (14, 14, 14, '2025-2026'), (15, 15, 15, '2025-2026'), (16, 16, 16, '2025-2026'),
(17, 17, 17, '2025-2026'), (18, 18, 18, '2025-2026'), (19, 19, 19, '2025-2026'), (20, 20, 20, '2025-2026');

INSERT INTO Timetable (OfferingID, RoomID, SlotID) VALUES
(1, 1, 1), (1, 1, 9), (2, 2, 2), (2, 2, 10), (3, 3, 3), (3, 3, 11), (4, 4, 4), (4, 4, 12),
(5, 5, 5), (5, 5, 13), (6, 6, 6), (6, 6, 1), (7, 7, 7), (7, 7, 2), (8, 8, 8), (9, 9, 9),
(10, 10, 1), (10, 10, 2), (11, 11, 3), (11, 11, 4), (12, 12, 5), (12, 12, 6), (13, 13, 7), (13, 13, 8),
(14, 14, 9), (14, 14, 10), (15, 15, 11), (15, 15, 12), (16, 16, 13), (17, 17, 1), (18, 18, 2), (19, 19, 3),
(20, 20, 4);
