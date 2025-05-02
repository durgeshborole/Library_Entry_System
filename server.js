// ======= server.js =======
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();
const PORT = 5000;
const cron = require('node-cron');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });


// Middleware setup
app.use(cors());
app.use(express.json());
app.use(express.static("public"));


// MongoDB connection
mongoose.connect('mongodb+srv://durgeshborole:Librarysystem@cluster0.mmvqgkq.mongodb.net/library?retryWrites=true&w=majority', {
}).then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Schemas
const visitorSchema = new mongoose.Schema({
  barcode: String,
  name: String,
  photoUrl: String,
});

const logSchema = new mongoose.Schema({
  barcode: String,
  name: String,
  department: String,
  year: String,
  designation: String,
  date: String,
  entryTime: { type: Date, default: Date.now },
  exitTime: Date,
});

const noticeSchema = new mongoose.Schema({
  text: String,
  timestamp: { type: Date, default: Date.now }
});

const Notice = mongoose.model('Notice', noticeSchema);


const Visitor = mongoose.model('Visitor', visitorSchema);
const Log = mongoose.model('Log', logSchema);

// function decodeBarcode(barcode) {
//   const admissionYearCode = barcode.slice(0, 2);
//   const deptCode = barcode.charAt(2);
//   const enrollYearCode = barcode.slice(3, 5);
//   const designationCode = barcode.charAt(0);

//   const departments = {
//     '1': "Civil",
//     '2': "Mechanical",
//     '3': "Computer Science",
//     '4': "Electronics and Communication",
//     '5': "Electronics and Computer",
//     'B': "Library",
//   };

//   let designation = "Unknown";
//   let year = "N/A";

//   if (designationCode === 'F') {
//     designation = "Faculty";
//     year = "N/A";
//   } else if (designationCode === 'L') {
//     designation = "Librarian";
//   } else if (designationCode === '2') {
//     designation = "Student";

//     if (enrollYearCode === "20") {
//       year = "Second"; // DSY student
//     } else if (enrollYearCode === "10") {
//       const admissionYearMap = {
//         '21': "Final",
//         '22': "Third",
//         '23': "Second",
//         '24': "First",
//         '25': "First"
//       };
//       year = admissionYearMap[admissionYearCode] || "Unknown";
//     } else {
//       year = "Unknown";
//     }
//   }

//   return {
//     year,
//     department: departments[deptCode] || "Unknown",
//     designation
//   };
// }

function decodeBarcode(barcode) {
  if (!barcode || barcode.length < 5) {
    return {
      year: "Unknown",
      department: "Unknown",
      designation: "Unknown"
    };
  }

  const admissionYearCode = barcode.slice(0, 2);  // e.g., "23"
  const enrollYearCode = barcode.slice(3, 5);      // "10" (Regular) or "20" (DSY)
  const designationCode = barcode.charAt(0);       // "2", "F", "L"

  const departments = {
    '1': "Civil",
    '2': "Mechanical",
    '3': "Computer Science",
    '4': "Electronics and Communication",
    '5': "Electronics and Computer",
    'B': "Library",
  };

  let designation = "Unknown";
  let department = "Unknown";
  let year = "N/A";

  if (designationCode === 'F') {
    designation = "Faculty";
    department = departments[barcode.charAt(3)] || "Unknown";  // Faculty dept at index 3
  } else if (designationCode === 'L') {
    designation = "Librarian";
    department = "Library"; // fixed for librarian
  } else if (designationCode === '2') {
    designation = "Student";
    department = departments[barcode.charAt(2)] || "Unknown";  // Student dept at index 2

    const now = new Date();
    let currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0 = Jan, 6 = July

    // Academic year starts from July
    if (currentMonth < 6) {
      currentYear--; // Before July, still in previous academic year
    }

    const admissionFullYear = 2000 + parseInt(admissionYearCode);
    const diff = currentYear - admissionFullYear;

    if (enrollYearCode === "10") {
      if (diff === 0) {
        year = "First";
      } else if (diff === 1) {
        year = "Second";
      } else if (diff === 2) {
        year = "Third";
      } else if (diff === 3) {
        year = "Final";
      } else {
        year = "Graduated";
      }
    } else if (enrollYearCode === "20") {
      if (diff === 0) {
        year = "Second";
      } else if (diff === 1) {
        year = "Third";
      } else if (diff === 2) {
        year = "Final";
      } else {
        year = "Graduated";
      }
    } else {
      year = "Unknown";
    }
  }

  return {
    year,
    department,
    designation
  };
}


function getCurrentDateString() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

app.post('/scan', async (req, res) => {
  const barcode = req.body?.barcode;
  if (!barcode) {
    return res.status(400).json({ error: 'Invalid or missing barcode in request body' });
  }

  try {
    const visitor = await Visitor.findOne({ barcode });

    if (!visitor) {
      return res.status(404).json({ error: 'Visitor not found in database' });
    }

    const decoded = decodeBarcode(String(barcode));
    const today = getCurrentDateString();

    const existing = await Log.findOne({ barcode, exitTime: null, date: today });

    if (existing) {
      existing.exitTime = new Date();
      await existing.save();
      return res.status(200).json({ ...existing._doc, status: "exit", photoUrl: visitor.photoUrl });
    }

    const newEntry = new Log({
      barcode,
      name: visitor.name,
      department: decoded.department,
      year: decoded.year,
      designation: decoded.designation,
      date: today,
    });

    const saved = await newEntry.save();
    return res.status(200).json({ ...saved._doc, status: "entry", photoUrl: visitor.photoUrl });
  } catch (error) {
    console.error('Error during scan:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

app.get('/live-log', async (req, res) => {
  try {
    const today = getCurrentDateString();
    const logs = await Log.find({ date: today }).sort({ entryTime: -1 });
    return res.status(200).json(logs);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch live log' });
  }
});

// New endpoint to support analysis.js — returns all logs
app.get('/all-logs', async (req, res) => {
  try {
    const logs = await Log.find().sort({ entryTime: -1 });
    res.status(200).json(logs);
  } catch (err) {
    console.error("Failed to fetch all logs:", err);
    res.status(500).json({ error: "Failed to fetch all logs" });
  }
});

app.get('/stats', async (req, res) => {
  try {
    const today = getCurrentDateString();

    const todayLogs = await Log.find({ date: today });

    const totalVisitorsToday = todayLogs.length;
    const currentlyInside = todayLogs.filter(log => !log.exitTime).length;

    const deptCount = {};
    todayLogs.forEach(log => {
      if (log.department) {
        deptCount[log.department] = (deptCount[log.department] || 0) + 1;
      }
    });

    const mostFrequentDept = Object.entries(deptCount)
      .sort((a, b) => b[1] - a[1])[0]?.[0];

    const latestEntry = todayLogs
      .sort((a, b) => new Date(b.entryTime) - new Date(a.entryTime))[0];

    const lastEntry = latestEntry
      ? new Date(latestEntry.entryTime).toLocaleTimeString()
      : null;

    res.status(200).json({
      totalVisitorsToday,
      currentlyInside,
      mostFrequentDept,
      lastEntry
    });
  } catch (err) {
    console.error("Error generating stats:", err);
    res.status(500).json({ error: "Failed to generate stats" });
  }
});

let AUTO_EXIT_HOUR = 21; // Default: 9 PM
let AUTO_EXIT_MINUTE = 0;

cron.schedule('* * * * *', async () => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  if (currentHour === AUTO_EXIT_HOUR && currentMinute === AUTO_EXIT_MINUTE) {
    const today = getCurrentDateString();
    const autoExitTime = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      AUTO_EXIT_HOUR,
      AUTO_EXIT_MINUTE,
      0
    );

    try {
      const result = await Log.updateMany(
        { date: today, exitTime: null },
        { $set: { exitTime: autoExitTime } }
      );

      console.log(`🕘 Auto-exit applied: ${result.modifiedCount} entries closed at ${autoExitTime.toLocaleTimeString()}`);
    } catch (err) {
      console.error("❌ Auto-exit failed:", err);
    }
  }
});

// Admin: update auto-exit time
app.post('/admin/auto-exit', (req, res) => {
  const { hour, minute } = req.body;
  if (hour === undefined || minute === undefined) {
    return res.status(400).json({ error: "Hour and minute are required." });
  }

  AUTO_EXIT_HOUR = parseInt(hour);
  AUTO_EXIT_MINUTE = parseInt(minute);
  return res.status(200).json({ message: `Auto-exit time updated to ${AUTO_EXIT_HOUR}:${AUTO_EXIT_MINUTE}` });
});

// Admin: force exit manually
app.post('/admin/force-exit', async (req, res) => {
  const today = getCurrentDateString();
  const now = new Date();

  try {
    const result = await Log.updateMany(
      { date: today, exitTime: null },
      { $set: { exitTime: now } }
    );
    return res.status(200).json({ message: "Force exit completed.", modifiedCount: result.modifiedCount });
  } catch (err) {
    console.error("❌ Manual force exit failed:", err);
    return res.status(500).json({ error: "Manual exit failed." });
  }
});

// Admin: Add a new notice
app.post('/admin/notices', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Notice text required' });

  try {
    const newNotice = new Notice({ text });
    await newNotice.save();
    res.status(201).json({ message: 'Notice posted successfully' });
  } catch (err) {
    console.error('Failed to save notice:', err);
    res.status(500).json({ error: 'Failed to save notice' });
  }
});

app.post('/admin/notices', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Notice text required' });

  try {
    const newNotice = new Notice({ text });
    await newNotice.save();
    res.status(201).json({ success: true, message: 'Notice posted successfully' });
  } catch (err) {
    console.error('Failed to save notice:', err);
    res.status(500).json({ error: 'Failed to save notice' });
  }
});

// Notice GET API
app.get('/notices', async (req, res) => {
  try {
    const notices = await Notice.find().sort({ timestamp: -1 }).limit(5);
    res.status(200).json(notices);
  } catch (err) {
    console.error('Failed to fetch notices:', err);
    res.status(500).json({ error: 'Failed to load notices' });
  }
});

app.delete('/admin/notices/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await Notice.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: "Notice deleted successfully" });
  } catch (err) {
    console.error("Failed to delete notice:", err);
    res.status(500).json({ success: false, message: "Failed to delete notice" });
  }
});






app.post('/upload-photo', upload.single('photo'), async (req, res) => {
  const barcode = req.body.barcode;
  if (!barcode || !req.file) {
    return res.status(400).json({ success: false, message: 'Barcode and photo required.' });
  }

  try {
    const photoUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    const visitor = await Visitor.findOneAndUpdate(
      { barcode },
      { $set: { photoUrl } },
      { new: true }
    );

    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visitor not found.' });
    }

    res.status(200).json({ success: true, message: 'Photo uploaded and linked to barcode.' });
  } catch (error) {
    console.error('Error uploading photo:', error);
    res.status(500).json({ success: false, message: 'Server error during photo upload.' });
  }
});

app.post('/bulk-upload-photos', upload.array('photos',500), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No photos uploaded.' });
    }

    console.log('✅ Received files:', req.files.length);

    let uploadedCount = 0;

    for (const file of req.files) {
      const filenameWithoutExtension = file.originalname.split('.').slice(0, -1).join('.');
      const barcode = filenameWithoutExtension.trim();

      if (!barcode) continue;

      const photoUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

      let visitor = await Visitor.findOne({ barcode });

      if (!visitor) {
        visitor = new Visitor({ barcode, name: "Unknown", photoUrl });
      } else {
        visitor.photoUrl = photoUrl;
      }

      await visitor.save();
      uploadedCount++;
    }

    return res.status(200).json({ success: true, uploadedCount });
  } catch (err) {
    console.error('❌ Server crashed during upload:', err);
    return res.status(500).json({ success: false, message: 'Server crashed' });
  }
});





// Starts the server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});