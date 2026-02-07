# Enhanced FS - Quick Test Guide

## After Restarting Claude Desktop

### Test 1: Verify Tools Are Loaded
Ask Claude: "What enhanced-filesystem tools do you have available?"

You should see:
- enhanced-filesystem:efs_read
- enhanced-filesystem:efs_write
- enhanced-filesystem:efs_exec
- enhanced-filesystem:efs_python

### Test 2: File Operations (Already Tested)
These work! You've already tested them:
```
efs_read - Read files
efs_write - Write files (NO CHUNKING!)
```

### Test 3: Execute Shell Command
```
Use efs_exec to run "pip list"
```

Expected: List of installed Python packages

### Test 4: Execute Python Code
```
Use efs_python to execute: print(2 + 2)
```

Expected: Output "4"

### Test 5: Python with Pandas
```
Use efs_python to execute:
import pandas as pd
import numpy as np
print(f"Pandas: {pd.__version__}")
print(f"NumPy: {np.__version__}")
```

Expected: Version numbers for pandas and numpy

### Test 6: Real Data Analysis
```
Use efs_python to:
1. Create a small CSV file with test data
2. Read it with pandas
3. Print summary statistics
```

Example code:
```python
import pandas as pd
import numpy as np

# Create test data
data = {
    'name': ['Alice', 'Bob', 'Charlie'],
    'age': [25, 30, 35],
    'score': [85, 90, 95]
}
df = pd.DataFrame(data)

# Save to file
df.to_csv('D:/Projects/test-data.csv', index=False)

# Read it back
df2 = pd.read_csv('D:/Projects/test-data.csv')
print(df2.describe())
```

### Test 7: Streaming Write (Big File)
```
Use efs_write to create a file with 500 lines of test data
```

This would need 20+ calls with Desktop Commander.
With Enhanced FS: ONE call!

### Test 8: Command with Custom Timeout
```
Use efs_exec with:
- command: "python -c \"import time; time.sleep(2); print('Done!')\""
- timeout: 5000
```

Expected: "Done!" after 2 seconds

##  What to Look For

### Success Indicators:
-  Tools show up in Claude's list
-  Commands execute and return output
-  Python code runs with pandas/numpy
-  Large files write in single call
-  Timeouts work correctly

### If Something Fails:
1. Check Claude Desktop logs (in settings)
2. Look for errors in the MCP server logs
3. Verify Python 3 is in PATH
4. Restart Claude Desktop again

##  Performance to Notice

**File Writing:**
- Old way: Multiple chunks, manual management
- New way: ONE call, instant!

**Python Execution:**
- Old way: start_process → wait → interact → wait
- New way: efs_python → done!

**Commands:**
- Old way: start_process → interact → read_output
- New way: efs_exec → done!

##  Next Features to Add (Later)

If these work well, we can add:
1. **efs_edit** - Surgical file editing
2. **efs_list** - Directory listing
3. **efs_search** - Fast parallel search
4. **efs_batch** - Multiple operations atomically
5. **REPL pooling** - Pre-warmed Python with pandas loaded
6. **Sessions** - Persistent Python contexts

But for now, these 4 tools should handle 90% of your needs!

---

**Ready?** Restart Claude Desktop and try these tests!
