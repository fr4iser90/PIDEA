# Android Todo Application Patterns

## Overview
Android todo applications require specific patterns for data persistence, UI components, and user interactions. This guide covers essential patterns for building robust Android todo apps.

## Architecture Patterns

### MVVM with Repository Pattern
```kotlin
// Data Layer
data class Todo(
    val id: Long = 0,
    val title: String,
    val description: String? = null,
    val isCompleted: Boolean = false,
    val priority: Priority = Priority.MEDIUM,
    val dueDate: LocalDateTime? = null,
    val createdAt: LocalDateTime = LocalDateTime.now()
)

enum class Priority {
    LOW, MEDIUM, HIGH
}

// Repository Interface
interface TodoRepository {
    suspend fun getAllTodos(): Flow<List<Todo>>
    suspend fun getTodoById(id: Long): Todo?
    suspend fun insertTodo(todo: Todo): Long
    suspend fun updateTodo(todo: Todo)
    suspend fun deleteTodo(todo: Todo)
    suspend fun getTodosByPriority(priority: Priority): Flow<List<Todo>>
    suspend fun getCompletedTodos(): Flow<List<Todo>>
    suspend fun getPendingTodos(): Flow<List<Todo>>
}

// Repository Implementation
class TodoRepositoryImpl @Inject constructor(
    private val todoDao: TodoDao,
    private val dispatcher: CoroutineDispatcher = Dispatchers.IO
) : TodoRepository {
    
    override suspend fun getAllTodos(): Flow<List<Todo>> {
        return withContext(dispatcher) {
            todoDao.getAllTodos()
        }
    }
    
    override suspend fun insertTodo(todo: Todo): Long {
        return withContext(dispatcher) {
            todoDao.insertTodo(todo)
        }
    }
    
    override suspend fun updateTodo(todo: Todo) {
        withContext(dispatcher) {
            todoDao.updateTodo(todo)
        }
    }
    
    override suspend fun deleteTodo(todo: Todo) {
        withContext(dispatcher) {
            todoDao.deleteTodo(todo)
        }
    }
}
```

### ViewModel Pattern
```kotlin
@HiltViewModel
class TodoViewModel @Inject constructor(
    private val todoRepository: TodoRepository
) : ViewModel() {
    
    private val _todos = MutableStateFlow<List<Todo>>(emptyList())
    val todos: StateFlow<List<Todo>> = _todos.asStateFlow()
    
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()
    
    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()
    
    init {
        loadTodos()
    }
    
    private fun loadTodos() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                todoRepository.getAllTodos()
                    .catch { e ->
                        _error.value = e.message
                    }
                    .collect { todoList ->
                        _todos.value = todoList
                        _isLoading.value = false
                    }
            } catch (e: Exception) {
                _error.value = e.message
                _isLoading.value = false
            }
        }
    }
    
    fun addTodo(title: String, description: String? = null, priority: Priority = Priority.MEDIUM) {
        viewModelScope.launch {
            try {
                val todo = Todo(
                    title = title,
                    description = description,
                    priority = priority
                )
                todoRepository.insertTodo(todo)
            } catch (e: Exception) {
                _error.value = e.message
            }
        }
    }
    
    fun toggleTodoCompletion(todo: Todo) {
        viewModelScope.launch {
            try {
                val updatedTodo = todo.copy(isCompleted = !todo.isCompleted)
                todoRepository.updateTodo(updatedTodo)
            } catch (e: Exception) {
                _error.value = e.message
            }
        }
    }
    
    fun deleteTodo(todo: Todo) {
        viewModelScope.launch {
            try {
                todoRepository.deleteTodo(todo)
            } catch (e: Exception) {
                _error.value = e.message
            }
        }
    }
    
    fun updateTodoPriority(todo: Todo, priority: Priority) {
        viewModelScope.launch {
            try {
                val updatedTodo = todo.copy(priority = priority)
                todoRepository.updateTodo(updatedTodo)
            } catch (e: Exception) {
                _error.value = e.message
            }
        }
    }
}
```

## Database Layer

### Room Database Setup
```kotlin
@Entity(tableName = "todos")
data class TodoEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val title: String,
    val description: String?,
    val isCompleted: Boolean,
    val priority: String,
    val dueDate: Long?,
    val createdAt: Long
)

@Dao
interface TodoDao {
    @Query("SELECT * FROM todos ORDER BY createdAt DESC")
    fun getAllTodos(): Flow<List<TodoEntity>>
    
    @Query("SELECT * FROM todos WHERE isCompleted = 0 ORDER BY createdAt DESC")
    fun getPendingTodos(): Flow<List<TodoEntity>>
    
    @Query("SELECT * FROM todos WHERE isCompleted = 1 ORDER BY createdAt DESC")
    fun getCompletedTodos(): Flow<List<TodoEntity>>
    
    @Query("SELECT * FROM todos WHERE priority = :priority ORDER BY createdAt DESC")
    fun getTodosByPriority(priority: String): Flow<List<TodoEntity>>
    
    @Insert
    suspend fun insertTodo(todo: TodoEntity): Long
    
    @Update
    suspend fun updateTodo(todo: TodoEntity)
    
    @Delete
    suspend fun deleteTodo(todo: TodoEntity)
    
    @Query("DELETE FROM todos WHERE isCompleted = 1")
    suspend fun deleteCompletedTodos()
}

@Database(entities = [TodoEntity::class], version = 1)
abstract class TodoDatabase : RoomDatabase() {
    abstract fun todoDao(): TodoDao
    
    companion object {
        @Volatile
        private var INSTANCE: TodoDatabase? = null
        
        fun getDatabase(context: Context): TodoDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    TodoDatabase::class.java,
                    "todo_database"
                )
                .fallbackToDestructiveMigration()
                .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
```

## UI Components

### RecyclerView Adapter
```kotlin
class TodoAdapter(
    private val onTodoClick: (Todo) -> Unit,
    private val onTodoLongClick: (Todo) -> Unit,
    private val onCheckboxClick: (Todo) -> Unit
) : ListAdapter<Todo, TodoAdapter.TodoViewHolder>(TodoDiffCallback()) {
    
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): TodoViewHolder {
        val binding = ItemTodoBinding.inflate(
            LayoutInflater.from(parent.context), parent, false
        )
        return TodoViewHolder(binding)
    }
    
    override fun onBindViewHolder(holder: TodoViewHolder, position: Int) {
        holder.bind(getItem(position))
    }
    
    inner class TodoViewHolder(
        private val binding: ItemTodoBinding
    ) : RecyclerView.ViewHolder(binding.root) {
        
        fun bind(todo: Todo) {
            binding.apply {
                todoTitle.text = todo.title
                todoDescription.text = todo.description
                todoCheckbox.isChecked = todo.isCompleted
                
                // Set priority color
                val priorityColor = when (todo.priority) {
                    Priority.HIGH -> ContextCompat.getColor(root.context, R.color.priority_high)
                    Priority.MEDIUM -> ContextCompat.getColor(root.context, R.color.priority_medium)
                    Priority.LOW -> ContextCompat.getColor(root.context, R.color.priority_low)
                }
                priorityIndicator.setBackgroundColor(priorityColor)
                
                // Strike through completed todos
                todoTitle.paintFlags = if (todo.isCompleted) {
                    todoTitle.paintFlags or Paint.STRIKE_THRU_TEXT_FLAG
                } else {
                    todoTitle.paintFlags and Paint.STRIKE_THRU_TEXT_FLAG.inv()
                }
                
                // Click listeners
                root.setOnClickListener { onTodoClick(todo) }
                root.setOnLongClickListener { 
                    onTodoLongClick(todo)
                    true
                }
                todoCheckbox.setOnClickListener { onCheckboxClick(todo) }
            }
        }
    }
    
    class TodoDiffCallback : DiffUtil.ItemCallback<Todo>() {
        override fun areItemsTheSame(oldItem: Todo, newItem: Todo): Boolean {
            return oldItem.id == newItem.id
        }
        
        override fun areContentsTheSame(oldItem: Todo, newItem: Todo): Boolean {
            return oldItem == newItem
        }
    }
}
```

### Main Activity
```kotlin
@AndroidEntryPoint
class MainActivity : AppCompatActivity() {
    
    private lateinit var binding: ActivityMainBinding
    private val viewModel: TodoViewModel by viewModels()
    private lateinit var todoAdapter: TodoAdapter
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        setupRecyclerView()
        setupObservers()
        setupClickListeners()
    }
    
    private fun setupRecyclerView() {
        todoAdapter = TodoAdapter(
            onTodoClick = { todo -> showEditTodoDialog(todo) },
            onTodoLongClick = { todo -> showDeleteConfirmation(todo) },
            onCheckboxClick = { todo -> viewModel.toggleTodoCompletion(todo) }
        )
        
        binding.recyclerView.apply {
            adapter = todoAdapter
            layoutManager = LinearLayoutManager(this@MainActivity)
            addItemDecoration(DividerItemDecoration(context, DividerItemDecoration.VERTICAL))
        }
    }
    
    private fun setupObservers() {
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                launch {
                    viewModel.todos.collect { todos ->
                        todoAdapter.submitList(todos)
                    }
                }
                
                launch {
                    viewModel.isLoading.collect { isLoading ->
                        binding.progressBar.isVisible = isLoading
                    }
                }
                
                launch {
                    viewModel.error.collect { error ->
                        error?.let {
                            showErrorSnackbar(it)
                        }
                    }
                }
            }
        }
    }
    
    private fun setupClickListeners() {
        binding.fabAddTodo.setOnClickListener {
            showAddTodoDialog()
        }
    }
    
    private fun showAddTodoDialog() {
        val dialog = AddTodoDialogFragment()
        dialog.show(supportFragmentManager, "AddTodoDialog")
    }
    
    private fun showEditTodoDialog(todo: Todo) {
        val dialog = EditTodoDialogFragment.newInstance(todo)
        dialog.show(supportFragmentManager, "EditTodoDialog")
    }
    
    private fun showDeleteConfirmation(todo: Todo) {
        AlertDialog.Builder(this)
            .setTitle("Delete Todo")
            .setMessage("Are you sure you want to delete this todo?")
            .setPositiveButton("Delete") { _, _ ->
                viewModel.deleteTodo(todo)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
    
    private fun showErrorSnackbar(message: String) {
        Snackbar.make(binding.root, message, Snackbar.LENGTH_LONG).show()
    }
}
```

## Dialog Fragments

### Add Todo Dialog
```kotlin
class AddTodoDialogFragment : DialogFragment() {
    
    private var _binding: DialogAddTodoBinding? = null
    private val binding get() = _binding!!
    
    private val viewModel: TodoViewModel by activityViewModels()
    
    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        _binding = DialogAddTodoBinding.inflate(layoutInflater)
        
        return AlertDialog.Builder(requireContext())
            .setTitle("Add New Todo")
            .setView(binding.root)
            .setPositiveButton("Add") { _, _ ->
                addTodo()
            }
            .setNegativeButton("Cancel", null)
            .create()
    }
    
    private fun addTodo() {
        val title = binding.editTextTitle.text.toString().trim()
        val description = binding.editTextDescription.text.toString().trim()
        val priority = when (binding.radioGroupPriority.checkedRadioButtonId) {
            R.id.radioLow -> Priority.LOW
            R.id.radioHigh -> Priority.HIGH
            else -> Priority.MEDIUM
        }
        
        if (title.isNotEmpty()) {
            viewModel.addTodo(title, description, priority)
        }
    }
    
    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
```

## Navigation

### Navigation Graph
```xml
<?xml version="1.0" encoding="utf-8"?>
<navigation xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:id="@+id/nav_graph"
    app:startDestination="@id/todoListFragment">

    <fragment
        android:id="@+id/todoListFragment"
        android:name="com.example.todoapp.ui.TodoListFragment"
        android:label="Todo List">
        <action
            android:id="@+id/action_todoList_to_addTodo"
            app:destination="@id/addTodoFragment" />
        <action
            android:id="@+id/action_todoList_to_editTodo"
            app:destination="@id/editTodoFragment" />
    </fragment>

    <fragment
        android:id="@+id/addTodoFragment"
        android:name="com.example.todoapp.ui.AddTodoFragment"
        android:label="Add Todo" />

    <fragment
        android:id="@+id/editTodoFragment"
        android:name="com.example.todoapp.ui.EditTodoFragment"
        android:label="Edit Todo">
        <argument
            android:name="todoId"
            app:argType="long" />
    </fragment>

</navigation>
```

## Dependency Injection

### Hilt Module
```kotlin
@Module
@InstallIn(SingletonComponent::class)
object AppModule {
    
    @Provides
    @Singleton
    fun provideTodoDatabase(@ApplicationContext context: Context): TodoDatabase {
        return TodoDatabase.getDatabase(context)
    }
    
    @Provides
    @Singleton
    fun provideTodoDao(database: TodoDatabase): TodoDao {
        return database.todoDao()
    }
    
    @Provides
    @Singleton
    fun provideTodoRepository(todoDao: TodoDao): TodoRepository {
        return TodoRepositoryImpl(todoDao)
    }
    
    @Provides
    @Singleton
    fun provideCoroutineDispatcher(): CoroutineDispatcher {
        return Dispatchers.IO
    }
}
```

## Testing

### Unit Tests
```kotlin
@RunWith(MockitoJUnitRunner::class)
class TodoViewModelTest {
    
    @get:Rule
    val instantExecutorRule = InstantTaskExecutorRule()
    
    @Mock
    private lateinit var todoRepository: TodoRepository
    
    private lateinit var viewModel: TodoViewModel
    
    @Before
    fun setup() {
        viewModel = TodoViewModel(todoRepository)
    }
    
    @Test
    fun `addTodo should call repository insertTodo`() = runTest {
        // Given
        val title = "Test Todo"
        val description = "Test Description"
        val priority = Priority.HIGH
        
        // When
        viewModel.addTodo(title, description, priority)
        
        // Then
        verify(todoRepository).insertTodo(any())
    }
    
    @Test
    fun `toggleTodoCompletion should call repository updateTodo`() = runTest {
        // Given
        val todo = Todo(id = 1, title = "Test", isCompleted = false)
        
        // When
        viewModel.toggleTodoCompletion(todo)
        
        // Then
        verify(todoRepository).updateTodo(todo.copy(isCompleted = true))
    }
}
```

### UI Tests
```kotlin
@RunWith(AndroidJUnit4::class)
class MainActivityTest {
    
    @get:Rule
    val activityRule = ActivityScenarioRule(MainActivity::class.java)
    
    @Test
    fun testAddTodoFlow() {
        // Click FAB to add todo
        onView(withId(R.id.fabAddTodo)).perform(click())
        
        // Enter todo details
        onView(withId(R.id.editTextTitle)).perform(typeText("Test Todo"))
        onView(withId(R.id.editTextDescription)).perform(typeText("Test Description"))
        onView(withId(R.id.radioHigh)).perform(click())
        
        // Click add button
        onView(withText("Add")).perform(click())
        
        // Verify todo appears in list
        onView(withText("Test Todo")).check(matches(isDisplayed()))
    }
    
    @Test
    fun testToggleTodoCompletion() {
        // Add a todo first
        testAddTodoFlow()
        
        // Click checkbox to toggle completion
        onView(withId(R.id.todoCheckbox)).perform(click())
        
        // Verify todo is marked as completed (strikethrough)
        onView(withText("Test Todo")).check(matches(withTextColor(R.color.text_completed)))
    }
}
```

## Performance Optimization

### RecyclerView Optimization
```kotlin
// Enable view holder recycling
binding.recyclerView.setHasFixedSize(true)

// Use DiffUtil for efficient updates
class TodoDiffCallback : DiffUtil.ItemCallback<Todo>() {
    override fun areItemsTheSame(oldItem: Todo, newItem: Todo): Boolean {
        return oldItem.id == newItem.id
    }
    
    override fun areContentsTheSame(oldItem: Todo, newItem: Todo): Boolean {
        return oldItem == newItem
    }
}

// Implement view holder pattern
class TodoViewHolder(binding: ItemTodoBinding) : RecyclerView.ViewHolder(binding.root) {
    fun bind(todo: Todo) {
        // Bind data efficiently
    }
}
```

### Database Optimization
```kotlin
// Use indexes for frequently queried columns
@Entity(
    tableName = "todos",
    indices = [
        Index(value = ["isCompleted"]),
        Index(value = ["priority"]),
        Index(value = ["createdAt"])
    ]
)
data class TodoEntity(
    // ... properties
)

// Use batch operations for multiple items
@Dao
interface TodoDao {
    @Insert
    suspend fun insertTodos(todos: List<TodoEntity>)
    
    @Update
    suspend fun updateTodos(todos: List<TodoEntity>)
    
    @Delete
    suspend fun deleteTodos(todos: List<TodoEntity>)
}
```
