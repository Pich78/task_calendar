document.addEventListener('DOMContentLoaded', () => {
    const taskList = document.getElementById('task-list');
    const calendar = document.getElementById('calendar');
    const selectFolderButton = document.getElementById('select-folder');
    const prevMonthButton = document.getElementById('prev-month');
    const nextMonthButton = document.getElementById('next-month');

    let currentMonth = new Date().getMonth();
    let currentYear = new Date().getFullYear();
    let tasks = [];
    let folderHandle;

    selectFolderButton.addEventListener('click', async () => {
        folderHandle = await window.showDirectoryPicker();
        for await (const entry of folderHandle.values()) {
            if (entry.kind === 'file' && entry.name.endsWith('.json')) {
                const file = await entry.getFile();
                const content = await file.text();
                const task = JSON.parse(content);
                tasks.push({ ...task, fileHandle: entry });
                if (task.scheduled_date) {
                    addTaskToCalendar(task);
                } else {
                    addTaskToList(task);
                }
            }
        }
    });

    function addTaskToList(task) {
        const li = document.createElement('li');
        li.className = 'collection-item';
        li.textContent = task.description;
        li.draggable = true;
        li.dataset.taskId = task.id;
        taskList.appendChild(li);

        li.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', task.id);
        });
    }

    function addTaskToCalendar(task) {
        const dayCell = calendar.querySelector(`.day[data-date="${task.scheduled_date}"]`);
        if (dayCell) {
            dayCell.appendChild(createTaskElement(task));
        }
    }

    function renderCalendar() {
        calendar.innerHTML = '';
        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

        for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) {
            const emptyCell = document.createElement('div');
            calendar.appendChild(emptyCell);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dayCell = document.createElement('div');
            dayCell.className = 'day';
            dayCell.textContent = day;
            const date = new Date(currentYear, currentMonth, day, 12, 0, 0); // Set time to noon
            dayCell.dataset.date = date.toISOString().split('T')[0];
            if (date.getDay() === 0) {
                dayCell.classList.add('sunday');
            }
            calendar.appendChild(dayCell);

            dayCell.addEventListener('dragover', (e) => {
                e.preventDefault();
            });

            dayCell.addEventListener('drop', async (e) => {
                e.preventDefault();
                const taskId = e.dataTransfer.getData('text/plain');
                const task = tasks.find(t => t.id == taskId);
                if (task) {
                    const oldDayCell = calendar.querySelector(`.day .task[data-task-id="${taskId}"]`);
                    if (oldDayCell) {
                        oldDayCell.remove();
                    }
                    dayCell.appendChild(createTaskElement(task));
                    await updateTaskFile(task, dayCell.dataset.date);
                }
            });
        }
    }

    function createTaskElement(task) {
        const div = document.createElement('div');
        div.className = 'task';
        div.textContent = task.description;
        div.draggable = true;
        div.dataset.taskId = task.id;

        div.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', task.id);
        });

        return div;
    }

    async function updateTaskFile(task, scheduledDate) {
        if (scheduledDate) {
            task.scheduled_date = scheduledDate;
        } else {
            delete task.scheduled_date;
        }
        const { fileHandle, ...taskWithoutFileHandle } = task; // Exclude fileHandle
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(taskWithoutFileHandle, null, 4));
        await writable.close();
    }

    taskList.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    taskList.addEventListener('drop', async (e) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('text/plain');
        const task = tasks.find(t => t.id == taskId);
        if (task) {
            const oldDayCell = calendar.querySelector(`.day .task[data-task-id="${taskId}"]`);
            if (oldDayCell) {
                oldDayCell.remove();
            }
            addTaskToList(task);
            await updateTaskFile(task, null);
        }
    });

    prevMonthButton.addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderCalendar();
    });

    nextMonthButton.addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCalendar();
    });

    renderCalendar();
});