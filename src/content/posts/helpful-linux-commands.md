---
title: "Helpful Linux commands"
date: 2026-02-24T18:25:36.671Z
draft: false
---

A list of helpful Linux commands that I use regularly. This is more for my own reference, but hopefully it can be useful to others as well.

## Listing files and directories

```bash
# List all files in the current directory
ls

# List all files in the current directory, including hidden files
ls -a

# List all files in the current directory, with detailed information
ls -l

# List all files in the current directory, with detailed information and human-readable file sizes
ls -lh

# List all files in the current directory and its subdirectories
ls -R
```

## Navigating & managing files and directories

```bash
# Change to a different directory
cd /path/to/directory

# Create a new directory
mkdir new_directory

# Remove a file
rm file.txt

# Remove a certain type of file (e.g. all .txt files)
rm *.txt

# Remove a directory and its contents
rm -r directory_name

# Copy a file
cp source_file.txt destination_file.txt

# Move a file
mv source_file.txt destination_file.txt
```

## Finding files

```bash
# Find a file by name
find /path/to/search -name "filename.txt"

# Find a file by name in current directory
find . -name "filename.txt"

# Find all .txt files in current directory
find . -type f -name "*.txt"

# Find all .log files in current directory and copy them to a backup directory
find . -type f -name "*.log" -exec cp {} ./backup \;

# Find all .txt files in current directory and copy them to a backup directory, preserving the directory structure
find . -type f -name "*.txt" -exec rsync -R {} ./backup \;
```

## Viewing file contents

```bash
# View the contents of a file
cat file.txt

# View the contents of a file with line numbers
cat -n file.txt

# View the contents of a file one page at a time
less file.txt

# View the first 10 lines of a file
head file.txt

# View the last 10 lines of a file
tail file.txt
```

## Searching within files

```bash
# Search for a specific string in a file
grep "search_string" file.txt

# Search for a specific string in all .txt files in the current directory
grep "search_string" *.txt

# Search for a specific string in all files in the current directory and subdirectories
grep -r "search_string" .
```

## Combining commands

```bash
# Find all .txt files in the current directory and subdirectories, and display their contents
find . -type f -name "*.txt" | xargs cat

# Combine find, cat, and grep to search for a specific string in all .txt files in the current directory and subdirectories
find . -type f -name "*.txt" | xargs cat | grep "ERROR"

# Combine find, cat, grep, sort, and uniq to search for a specific string in all .txt files in the current directory and subdirectories, sort the results by the 4th field, and remove duplicate lines based on the 3rd field
find . -type f -name "*.txt" | xargs cat | grep "ERROR" | sort -k4 | uniq -f3

# Combine find, cat, grep, sort, and uniq to search for a specific string in all .txt files in the current directory and subdirectories, sort the results by the 4th field, remove duplicate lines based on the 3rd field, and save the output to a file called errors.log
find . -type f -name "*.txt" | xargs cat | grep "ERROR" | sort -k4 | uniq -f3 > errors.log
```

## System information

```bash
# Display the current date and time
date

# Display the current working directory
pwd

# Display the current user
whoami

# Display the system's hostname
hostname

# Display the system's uptime
uptime

# Display the system's disk usage
df -h
```

## Process management

```bash
# Display all running processes
ps aux

# Display all running processes and their resource usage
top

# Kill a process by its PID
kill PID

# Kill a process by its name
pkill process_name
```
