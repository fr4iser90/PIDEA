# Android Tech Stack

## Overview
Android development encompasses native Android applications using Kotlin/Java, modern architecture patterns, and comprehensive tooling. This tech stack covers modern Android development practices, architecture components, and ecosystem integration.

## Core Architecture

### MVVM with Architecture Components
```kotlin
// ViewModel
class UserViewModel @Inject constructor(
    private val userRepository: UserRepository,
    private val savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val _userState = MutableStateFlow<UserState>(UserState.Loading)
    val userState: StateFlow<UserState> = _userState.asStateFlow()

    private val _userProfile = MutableStateFlow<UserProfile?>(null)
    val userProfile: StateFlow<UserProfile?> = _userProfile.asStateFlow()

    init {
        loadUserProfile()
    }

    fun loadUserProfile() {
        viewModelScope.launch {
            _userState.value = UserState.Loading
            try {
                val userId = savedStateHandle.get<String>("userId")
                val profile = userRepository.getUserProfile(userId)
                _userProfile.value = profile
                _userState.value = UserState.Success(profile)
            } catch (e: Exception) {
                _userState.value = UserState.Error(e.message ?: "Unknown error")
            }
        }
    }

    fun updateUserProfile(updates: UserProfileUpdates) {
        viewModelScope.launch {
            try {
                val updatedProfile = userRepository.updateUserProfile(updates)
                _userProfile.value = updatedProfile
                _userState.value = UserState.Success(updatedProfile)
            } catch (e: Exception) {
                _userState.value = UserState.Error(e.message ?: "Update failed")
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            userRepository.logout()
            _userProfile.value = null
            _userState.value = UserState.Loading
        }
    }
}

// State classes
sealed class UserState {
    object Loading : UserState()
    data class Success(val user: UserProfile) : UserState()
    data class Error(val message: String) : UserState()
}

// Repository
@Singleton
class UserRepository @Inject constructor(
    private val userApi: UserApi,
    private val userDao: UserDao,
    private val userPreferences: UserPreferences
) {
    suspend fun getUserProfile(userId: String?): UserProfile {
        return try {
            // Try to get from cache first
            val cachedUser = userDao.getUserById(userId)
            if (cachedUser != null && !isCacheExpired(cachedUser)) {
                return cachedUser
            }

            // Fetch from network
            val networkUser = userApi.getUserProfile(userId)
            userDao.insertUser(networkUser)
            networkUser
        } catch (e: Exception) {
            // Return cached data if available
            userDao.getUserById(userId) ?: throw e
        }
    }

    suspend fun updateUserProfile(updates: UserProfileUpdates): UserProfile {
        val updatedProfile = userApi.updateUserProfile(updates)
        userDao.insertUser(updatedProfile)
        return updatedProfile
    }

    suspend fun logout() {
        userDao.clearAllUsers()
        userPreferences.clearUserData()
    }

    private fun isCacheExpired(user: UserProfile): Boolean {
        val cacheTime = user.lastUpdated
        val currentTime = System.currentTimeMillis()
        return (currentTime - cacheTime) > CACHE_EXPIRY_TIME
    }

    companion object {
        private const val CACHE_EXPIRY_TIME = 5 * 60 * 1000L // 5 minutes
    }
}
```

### Dependency Injection with Hilt
```kotlin
// Application class
@HiltAndroidApp
class MyApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        setupTimber()
        setupWorkManager()
    }

    private fun setupTimber() {
        if (BuildConfig.DEBUG) {
            Timber.plant(Timber.DebugTree())
        }
    }

    private fun setupWorkManager() {
        WorkManager.initialize(
            this,
            Configuration.Builder()
                .setMinimumLoggingLevel(if (BuildConfig.DEBUG) Log.DEBUG else Log.ERROR)
                .build()
        )
    }
}

// Network module
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideOkHttpClient(): OkHttpClient {
        return OkHttpClient.Builder()
            .addInterceptor(HttpLoggingInterceptor().apply {
                level = if (BuildConfig.DEBUG) 
                    HttpLoggingInterceptor.Level.BODY 
                else 
                    HttpLoggingInterceptor.Level.NONE
            })
            .addInterceptor(AuthInterceptor())
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient): Retrofit {
        return Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .addCallAdapterFactory(CoroutineCallAdapterFactory())
            .build()
    }

    @Provides
    @Singleton
    fun provideUserApi(retrofit: Retrofit): UserApi {
        return retrofit.create(UserApi::class.java)
    }

    @Provides
    @Singleton
    fun provideProductApi(retrofit: Retrofit): ProductApi {
        return retrofit.create(ProductApi::class.java)
    }
}

// Database module
@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): AppDatabase {
        return Room.databaseBuilder(
            context,
            AppDatabase::class.java,
            "app_database"
        )
        .fallbackToDestructiveMigration()
        .build()
    }

    @Provides
    @Singleton
    fun provideUserDao(database: AppDatabase): UserDao {
        return database.userDao()
    }

    @Provides
    @Singleton
    fun provideProductDao(database: AppDatabase): ProductDao {
        return database.productDao()
    }
}

// Repository module
@Module
@InstallIn(SingletonComponent::class)
object RepositoryModule {

    @Provides
    @Singleton
    fun provideUserRepository(
        userApi: UserApi,
        userDao: UserDao,
        userPreferences: UserPreferences
    ): UserRepository {
        return UserRepository(userApi, userDao, userPreferences)
    }

    @Provides
    @Singleton
    fun provideProductRepository(
        productApi: ProductApi,
        productDao: ProductDao
    ): ProductRepository {
        return ProductRepository(productApi, productDao)
    }
}
```

## UI Components

### Compose UI
```kotlin
// Main Activity
@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MyAppTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    MainNavigation()
                }
            }
        }
    }
}

// Navigation
@Composable
fun MainNavigation() {
    val navController = rememberNavController()
    
    NavHost(navController = navController, startDestination = "home") {
        composable("home") {
            HomeScreen(navController)
        }
        composable("profile") {
            ProfileScreen(navController)
        }
        composable("products") {
            ProductsScreen(navController)
        }
        composable("product/{productId}") { backStackEntry ->
            val productId = backStackEntry.arguments?.getString("productId")
            ProductDetailScreen(productId, navController)
        }
    }
}

// Home Screen
@Composable
fun HomeScreen(navController: NavController) {
    val viewModel: HomeViewModel = hiltViewModel()
    val uiState by viewModel.uiState.collectAsState()
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Text(
            text = "Welcome Home",
            style = MaterialTheme.typography.h4,
            modifier = Modifier.padding(bottom = 16.dp)
        )
        
        when (uiState) {
            is HomeUiState.Loading -> {
                CircularProgressIndicator(
                    modifier = Modifier.align(Alignment.CenterHorizontally)
                )
            }
            is HomeUiState.Success -> {
                val data = uiState.data
                LazyColumn {
                    items(data.featuredProducts) { product ->
                        ProductCard(
                            product = product,
                            onClick = {
                                navController.navigate("product/${product.id}")
                            }
                        )
                    }
                }
            }
            is HomeUiState.Error -> {
                ErrorMessage(
                    message = uiState.message,
                    onRetry = { viewModel.loadHomeData() }
                )
            }
        }
    }
}

// Product Card Component
@Composable
fun ProductCard(
    product: Product,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp)
            .clickable { onClick() },
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            AsyncImage(
                model = product.imageUrl,
                contentDescription = product.name,
                modifier = Modifier
                    .size(80.dp)
                    .clip(RoundedCornerShape(8.dp)),
                contentScale = ContentScale.Crop
            )
            
            Spacer(modifier = Modifier.width(16.dp))
            
            Column {
                Text(
                    text = product.name,
                    style = MaterialTheme.typography.h6
                )
                Text(
                    text = product.description,
                    style = MaterialTheme.typography.body2,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = "$${product.price}",
                    style = MaterialTheme.typography.h6,
                    color = MaterialTheme.colorScheme.primary
                )
            }
        }
    }
}

// Custom Theme
@Composable
fun MyAppTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}

val LightColorScheme = lightColorScheme(
    primary = Purple40,
    secondary = PurpleGrey40,
    tertiary = Pink40,
    background = Color(0xFFFFFBFE),
    surface = Color(0xFFFFFBFE),
    onPrimary = Color.White,
    onSecondary = Color.White,
    onTertiary = Color.White,
    onBackground = Color(0xFF1C1B1F),
    onSurface = Color(0xFF1C1B1F),
)

val DarkColorScheme = darkColorScheme(
    primary = Purple80,
    secondary = PurpleGrey80,
    tertiary = Pink80,
    background = Color(0xFF1C1B1F),
    surface = Color(0xFF1C1B1F),
    onPrimary = Color.Black,
    onSecondary = Color.Black,
    onTertiary = Color.Black,
    onBackground = Color(0xFFE6E1E5),
    onSurface = Color(0xFFE6E1E5),
)
```

## Data Layer

### Room Database
```kotlin
// Database
@Database(
    entities = [User::class, Product::class, Order::class],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun userDao(): UserDao
    abstract fun productDao(): ProductDao
    abstract fun orderDao(): OrderDao
}

// Entities
@Entity(tableName = "users")
data class User(
    @PrimaryKey val id: String,
    val name: String,
    val email: String,
    val avatarUrl: String?,
    val preferences: String, // JSON string
    val lastUpdated: Long = System.currentTimeMillis()
)

@Entity(tableName = "products")
data class Product(
    @PrimaryKey val id: String,
    val name: String,
    val description: String,
    val price: Double,
    val imageUrl: String,
    val category: String,
    val inStock: Boolean,
    val lastUpdated: Long = System.currentTimeMillis()
)

@Entity(tableName = "orders")
data class Order(
    @PrimaryKey val id: String,
    val userId: String,
    val items: String, // JSON string
    val total: Double,
    val status: String,
    val createdAt: Long = System.currentTimeMillis()
)

// DAOs
@Dao
interface UserDao {
    @Query("SELECT * FROM users WHERE id = :userId")
    suspend fun getUserById(userId: String?): User?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertUser(user: User)

    @Query("DELETE FROM users")
    suspend fun clearAllUsers()

    @Query("SELECT * FROM users WHERE lastUpdated < :timestamp")
    suspend fun getExpiredUsers(timestamp: Long): List<User>
}

@Dao
interface ProductDao {
    @Query("SELECT * FROM products")
    suspend fun getAllProducts(): List<Product>

    @Query("SELECT * FROM products WHERE category = :category")
    suspend fun getProductsByCategory(category: String): List<Product>

    @Query("SELECT * FROM products WHERE name LIKE '%' || :query || '%'")
    suspend fun searchProducts(query: String): List<Product>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertProducts(products: List<Product>)

    @Query("DELETE FROM products")
    suspend fun clearAllProducts()
}
```

### API Layer
```kotlin
// API interfaces
interface UserApi {
    @GET("users/profile")
    suspend fun getUserProfile(@Query("userId") userId: String?): User

    @PUT("users/profile")
    suspend fun updateUserProfile(@Body updates: UserProfileUpdates): User

    @POST("users/logout")
    suspend fun logout(): Response<Unit>
}

interface ProductApi {
    @GET("products")
    suspend fun getProducts(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
        @Query("category") category: String? = null
    ): ProductsResponse

    @GET("products/{productId}")
    suspend fun getProduct(@Path("productId") productId: String): Product

    @GET("products/search")
    suspend fun searchProducts(@Query("q") query: String): ProductsResponse
}

// Data classes
data class ProductsResponse(
    val products: List<Product>,
    val total: Int,
    val page: Int,
    val limit: Int
)

data class UserProfileUpdates(
    val name: String? = null,
    val email: String? = null,
    val avatarUrl: String? = null,
    val preferences: Map<String, Any>? = null
)

// Interceptors
class AuthInterceptor : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        
        // Add auth token if available
        val token = UserPreferences.getAuthToken()
        val authenticatedRequest = if (token != null) {
            originalRequest.newBuilder()
                .header("Authorization", "Bearer $token")
                .build()
        } else {
            originalRequest
        }
        
        return chain.proceed(authenticatedRequest)
    }
}
```

## Background Processing

### WorkManager
```kotlin
// Sync worker
class DataSyncWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    @Inject
    lateinit var userRepository: UserRepository

    @Inject
    lateinit var productRepository: ProductRepository

    override suspend fun doWork(): Result {
        return try {
            // Sync user data
            userRepository.syncUserData()
            
            // Sync products
            productRepository.syncProducts()
            
            Result.success()
        } catch (e: Exception) {
            Timber.e(e, "Data sync failed")
            if (runAttemptCount < 3) {
                Result.retry()
            } else {
                Result.failure()
            }
        }
    }

    companion object {
        fun enqueue(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .setRequiresBatteryNotLow(true)
                .build()

            val syncRequest = PeriodicWorkRequestBuilder<DataSyncWorker>(
                repeatInterval = 6,
                repeatIntervalTimeUnit = TimeUnit.HOURS
            )
                .setConstraints(constraints)
                .setBackoffCriteria(
                    BackoffPolicy.EXPONENTIAL,
                    OneTimeWorkRequest.MIN_BACKOFF_MILLIS,
                    TimeUnit.MILLISECONDS
                )
                .build()

            WorkManager.getInstance(context)
                .enqueueUniquePeriodicWork(
                    "data_sync",
                    ExistingPeriodicWorkPolicy.KEEP,
                    syncRequest
                )
        }
    }
}

// Notification worker
class NotificationWorker(
    context: Context,
    params: WorkerParameters
) : Worker(context, params) {

    override fun doWork(): Result {
        val notificationManager = NotificationManagerCompat.from(applicationContext)
        
        val notification = NotificationCompat.Builder(applicationContext, CHANNEL_ID)
            .setContentTitle("Data Sync Complete")
            .setContentText("Your data has been synchronized successfully")
            .setSmallIcon(R.drawable.ic_sync)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .build()

        notificationManager.notify(NOTIFICATION_ID, notification)
        
        return Result.success()
    }

    companion object {
        private const val CHANNEL_ID = "data_sync_channel"
        private const val NOTIFICATION_ID = 1
    }
}
```

## Security

### Encrypted Preferences
```kotlin
// Encrypted preferences
class EncryptedPreferences @Inject constructor(@ApplicationContext context: Context) {
    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val sharedPreferences = EncryptedSharedPreferences.create(
        context,
        "secure_prefs",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    fun saveAuthToken(token: String) {
        sharedPreferences.edit().putString("auth_token", token).apply()
    }

    fun getAuthToken(): String? {
        return sharedPreferences.getString("auth_token", null)
    }

    fun clearAuthToken() {
        sharedPreferences.edit().remove("auth_token").apply()
    }

    fun saveUserPreferences(preferences: Map<String, Any>) {
        val json = Gson().toJson(preferences)
        sharedPreferences.edit().putString("user_preferences", json).apply()
    }

    fun getUserPreferences(): Map<String, Any>? {
        val json = sharedPreferences.getString("user_preferences", null)
        return json?.let {
            Gson().fromJson(it, object : TypeToken<Map<String, Any>>() {}.type)
        }
    }
}
```

### Biometric Authentication
```kotlin
// Biometric manager
class BiometricManager @Inject constructor(@ApplicationContext private val context: Context) {
    private val biometricPrompt = BiometricPrompt.PromptInfo.Builder()
        .setTitle("Authenticate")
        .setSubtitle("Use your biometric to continue")
        .setNegativeButtonText("Cancel")
        .build()

    fun canAuthenticate(): Boolean {
        val biometricManager = BiometricManager.from(context)
        return biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG) == 
               BiometricManager.BIOMETRIC_SUCCESS
    }

    fun authenticate(
        activity: FragmentActivity,
        onSuccess: () -> Unit,
        onError: (String) -> Unit
    ) {
        val executor = ContextCompat.getMainExecutor(context)
        
        val biometricPrompt = BiometricPrompt(activity, executor,
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    super.onAuthenticationError(errorCode, errString)
                    onError(errString.toString())
                }

                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    super.onAuthenticationSucceeded(result)
                    onSuccess()
                }

                override fun onAuthenticationFailed() {
                    super.onAuthenticationFailed()
                    onError("Authentication failed")
                }
            })

        biometricPrompt.authenticate(biometricPrompt)
    }
}
```

## Testing

### Unit Testing
```kotlin
// ViewModel tests
@RunWith(MockitoJUnitRunner::class)
class UserViewModelTest {
    
    @get:Rule
    val instantExecutorRule = InstantTaskExecutorRule()
    
    @Mock
    private lateinit var userRepository: UserRepository
    
    @Mock
    private lateinit var savedStateHandle: SavedStateHandle
    
    private lateinit var viewModel: UserViewModel
    
    @Before
    fun setup() {
        viewModel = UserViewModel(userRepository, savedStateHandle)
    }
    
    @Test
    fun `loadUserProfile success`() = runTest {
        // Given
        val userId = "test_user_id"
        val userProfile = UserProfile(id = userId, name = "Test User")
        whenever(savedStateHandle.get<String>("userId")).thenReturn(userId)
        whenever(userRepository.getUserProfile(userId)).thenReturn(userProfile)
        
        // When
        viewModel.loadUserProfile()
        
        // Then
        val states = mutableListOf<UserState>()
        viewModel.userState.test {
            states.add(awaitItem()) // Loading
            states.add(awaitItem()) // Success
        }
        
        assertEquals(2, states.size)
        assertTrue(states[0] is UserState.Loading)
        assertTrue(states[1] is UserState.Success)
        assertEquals(userProfile, (states[1] as UserState.Success).user)
    }
    
    @Test
    fun `loadUserProfile error`() = runTest {
        // Given
        val userId = "test_user_id"
        val errorMessage = "Network error"
        whenever(savedStateHandle.get<String>("userId")).thenReturn(userId)
        whenever(userRepository.getUserProfile(userId)).thenThrow(RuntimeException(errorMessage))
        
        // When
        viewModel.loadUserProfile()
        
        // Then
        val states = mutableListOf<UserState>()
        viewModel.userState.test {
            states.add(awaitItem()) // Loading
            states.add(awaitItem()) // Error
        }
        
        assertEquals(2, states.size)
        assertTrue(states[0] is UserState.Loading)
        assertTrue(states[1] is UserState.Error)
        assertEquals(errorMessage, (states[1] as UserState.Error).message)
    }
}

// Repository tests
@RunWith(MockitoJUnitRunner::class)
class UserRepositoryTest {
    
    @Mock
    private lateinit var userApi: UserApi
    
    @Mock
    private lateinit var userDao: UserDao
    
    @Mock
    private lateinit var userPreferences: UserPreferences
    
    private lateinit var repository: UserRepository
    
    @Before
    fun setup() {
        repository = UserRepository(userApi, userDao, userPreferences)
    }
    
    @Test
    fun `getUserProfile returns cached data when available`() = runTest {
        // Given
        val userId = "test_user_id"
        val cachedUser = UserProfile(id = userId, name = "Cached User")
        whenever(userDao.getUserById(userId)).thenReturn(cachedUser)
        
        // When
        val result = repository.getUserProfile(userId)
        
        // Then
        assertEquals(cachedUser, result)
        verify(userApi, never()).getUserProfile(any())
    }
    
    @Test
    fun `getUserProfile fetches from network when cache is empty`() = runTest {
        // Given
        val userId = "test_user_id"
        val networkUser = UserProfile(id = userId, name = "Network User")
        whenever(userDao.getUserById(userId)).thenReturn(null)
        whenever(userApi.getUserProfile(userId)).thenReturn(networkUser)
        
        // When
        val result = repository.getUserProfile(userId)
        
        // Then
        assertEquals(networkUser, result)
        verify(userDao).insertUser(networkUser)
    }
}
```

### UI Testing
```kotlin
// Compose UI tests
@RunWith(AndroidJUnit4::class)
class HomeScreenTest {
    
    @get:Rule
    val composeTestRule = createComposeRule()
    
    @Test
    fun homeScreen_displaysLoadingState() {
        // Given
        val viewModel = mock<HomeViewModel>()
        whenever(viewModel.uiState).thenReturn(flowOf(HomeUiState.Loading))
        
        // When
        composeTestRule.setContent {
            HomeScreen(navController = mock())
        }
        
        // Then
        composeTestRule.onNodeWithTag("loading_indicator").assertIsDisplayed()
    }
    
    @Test
    fun homeScreen_displaysProducts_whenSuccess() {
        // Given
        val products = listOf(
            Product(id = "1", name = "Product 1", price = 10.0),
            Product(id = "2", name = "Product 2", price = 20.0)
        )
        val viewModel = mock<HomeViewModel>()
        whenever(viewModel.uiState).thenReturn(flowOf(HomeUiState.Success(HomeData(products))))
        
        // When
        composeTestRule.setContent {
            HomeScreen(navController = mock())
        }
        
        // Then
        composeTestRule.onNodeWithText("Product 1").assertIsDisplayed()
        composeTestRule.onNodeWithText("Product 2").assertIsDisplayed()
    }
    
    @Test
    fun homeScreen_displaysError_whenError() {
        // Given
        val errorMessage = "Network error"
        val viewModel = mock<HomeViewModel>()
        whenever(viewModel.uiState).thenReturn(flowOf(HomeUiState.Error(errorMessage)))
        
        // When
        composeTestRule.setContent {
            HomeScreen(navController = mock())
        }
        
        // Then
        composeTestRule.onNodeWithText(errorMessage).assertIsDisplayed()
        composeTestRule.onNodeWithText("Retry").assertIsDisplayed()
    }
}
```

## Performance Optimization

### Memory Management
```kotlin
// Image loading with Coil
@Composable
fun AsyncImage(
    model: String,
    contentDescription: String?,
    modifier: Modifier = Modifier,
    contentScale: ContentScale = ContentScale.Fit
) {
    AsyncImage(
        model = ImageRequest.Builder(LocalContext.current)
            .data(model)
            .crossfade(true)
            .placeholder(R.drawable.placeholder)
            .error(R.drawable.error_placeholder)
            .build(),
        contentDescription = contentDescription,
        modifier = modifier,
        contentScale = contentScale
    )
}

// Lazy loading with pagination
class ProductRepository @Inject constructor(
    private val productApi: ProductApi,
    private val productDao: ProductDao
) {
    private val _products = MutableStateFlow<PagingData<Product>>(PagingData.empty())
    val products: StateFlow<PagingData<Product>> = _products.asStateFlow()

    fun getProducts(category: String? = null): Flow<PagingData<Product>> {
        return Pager(
            config = PagingConfig(
                pageSize = 20,
                enablePlaceholders = false,
                prefetchDistance = 5
            ),
            pagingSourceFactory = {
                ProductPagingSource(productApi, category)
            }
        ).flow
    }
}

class ProductPagingSource(
    private val productApi: ProductApi,
    private val category: String?
) : PagingSource<Int, Product>() {

    override suspend fun load(params: LoadParams<Int>): LoadResult<Int, Product> {
        return try {
            val page = params.key ?: 1
            val response = productApi.getProducts(
                page = page,
                limit = params.loadSize,
                category = category
            )
            
            LoadResult.Page(
                data = response.products,
                prevKey = if (page == 1) null else page - 1,
                nextKey = if (response.products.isEmpty()) null else page + 1
            )
        } catch (e: Exception) {
            LoadResult.Error(e)
        }
    }

    override fun getRefreshKey(state: PagingState<Int, Product>): Int? {
        return state.anchorPosition?.let { anchorPosition ->
            state.closestPageToPosition(anchorPosition)?.prevKey?.plus(1)
                ?: state.closestPageToPosition(anchorPosition)?.nextKey?.minus(1)
        }
    }
}
```

## Best Practices

### Code Organization
- Use MVVM architecture with Repository pattern
- Implement proper separation of concerns
- Use dependency injection for better testability
- Follow Android naming conventions
- Implement proper error handling

### Performance
- Use lazy loading for images and data
- Implement proper caching strategies
- Use pagination for large datasets
- Optimize database queries
- Monitor memory usage

### Security
- Use encrypted storage for sensitive data
- Implement proper authentication
- Validate all user inputs
- Use HTTPS for network requests
- Follow security best practices

### Testing
- Write unit tests for ViewModels and Repositories
- Test UI components with Compose testing
- Mock external dependencies
- Test error scenarios
- Implement integration tests
