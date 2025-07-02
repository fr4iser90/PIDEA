# iOS Tech Stack

## Overview
iOS development encompasses native iOS applications using Swift/SwiftUI, modern architecture patterns, and comprehensive tooling. This tech stack covers modern iOS development practices, architecture components, and ecosystem integration.

## Core Architecture

### MVVM with Combine
```swift
// ViewModel
@MainActor
class UserViewModel: ObservableObject {
    @Published var userState: UserState = .loading
    @Published var userProfile: UserProfile?
    
    private let userRepository: UserRepository
    private var cancellables = Set<AnyCancellable>()
    
    init(userRepository: UserRepository) {
        self.userRepository = userRepository
        loadUserProfile()
    }
    
    func loadUserProfile() {
        userState = .loading
        
        userRepository.getUserProfile()
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    switch completion {
                    case .finished:
                        break
                    case .failure(let error):
                        self?.userState = .error(error.localizedDescription)
                    }
                },
                receiveValue: { [weak self] profile in
                    self?.userProfile = profile
                    self?.userState = .success(profile)
                }
            )
            .store(in: &cancellables)
    }
    
    func updateUserProfile(_ updates: UserProfileUpdates) {
        userRepository.updateUserProfile(updates)
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    switch completion {
                    case .finished:
                        break
                    case .failure(let error):
                        self?.userState = .error(error.localizedDescription)
                    }
                },
                receiveValue: { [weak self] profile in
                    self?.userProfile = profile
                    self?.userState = .success(profile)
                }
            )
            .store(in: &cancellables)
    }
    
    func logout() {
        userRepository.logout()
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { _ in },
                receiveValue: { [weak self] _ in
                    self?.userProfile = nil
                    self?.userState = .loading
                }
            )
            .store(in: &cancellables)
    }
}

// State enum
enum UserState {
    case loading
    case success(UserProfile)
    case error(String)
}

// Repository
class UserRepository {
    private let networkService: NetworkService
    private let storageService: StorageService
    
    init(networkService: NetworkService, storageService: StorageService) {
        self.networkService = networkService
        self.storageService = storageService
    }
    
    func getUserProfile() -> AnyPublisher<UserProfile, Error> {
        // Try to get from cache first
        if let cachedUser = storageService.getCachedUser(),
           !isCacheExpired(cachedUser) {
            return Just(cachedUser)
                .setFailureType(to: Error.self)
                .eraseToAnyPublisher()
        }
        
        // Fetch from network
        return networkService.fetchUserProfile()
            .handleEvents(receiveOutput: { [weak self] user in
                self?.storageService.cacheUser(user)
            })
            .eraseToAnyPublisher()
    }
    
    func updateUserProfile(_ updates: UserProfileUpdates) -> AnyPublisher<UserProfile, Error> {
        return networkService.updateUserProfile(updates)
            .handleEvents(receiveOutput: { [weak self] user in
                self?.storageService.cacheUser(user)
            })
            .eraseToAnyPublisher()
    }
    
    func logout() -> AnyPublisher<Void, Error> {
        return networkService.logout()
            .handleEvents(receiveCompletion: { [weak self] _ in
                self?.storageService.clearCache()
            })
            .eraseToAnyPublisher()
    }
    
    private func isCacheExpired(_ user: UserProfile) -> Bool {
        let cacheTime = user.lastUpdated
        let currentTime = Date().timeIntervalSince1970
        return (currentTime - cacheTime) > 300 // 5 minutes
    }
}
```

### Dependency Injection with Swinject
```swift
// Container setup
class AppContainer {
    static let shared = AppContainer()
    private let container = Container()
    
    private init() {
        setupServices()
        setupRepositories()
        setupViewModels()
    }
    
    private func setupServices() {
        container.register(NetworkService.self) { _ in
            NetworkService()
        }.inObjectScope(.container)
        
        container.register(StorageService.self) { _ in
            StorageService()
        }.inObjectScope(.container)
        
        container.register(KeychainService.self) { _ in
            KeychainService()
        }.inObjectScope(.container)
    }
    
    private func setupRepositories() {
        container.register(UserRepository.self) { resolver in
            let networkService = resolver.resolve(NetworkService.self)!
            let storageService = resolver.resolve(StorageService.self)!
            return UserRepository(networkService: networkService, storageService: storageService)
        }.inObjectScope(.container)
        
        container.register(ProductRepository.self) { resolver in
            let networkService = resolver.resolve(NetworkService.self)!
            let storageService = resolver.resolve(StorageService.self)!
            return ProductRepository(networkService: networkService, storageService: storageService)
        }.inObjectScope(.container)
    }
    
    private func setupViewModels() {
        container.register(UserViewModel.self) { resolver in
            let userRepository = resolver.resolve(UserRepository.self)!
            return UserViewModel(userRepository: userRepository)
        }
        
        container.register(ProductViewModel.self) { resolver in
            let productRepository = resolver.resolve(ProductRepository.self)!
            return ProductViewModel(productRepository: productRepository)
        }
    }
    
    func resolve<T>(_ type: T.Type) -> T? {
        return container.resolve(type)
    }
}

// App entry point
@main
struct MyApp: App {
    init() {
        // Initialize dependency injection
        _ = AppContainer.shared
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
```

## UI Components

### SwiftUI Views
```swift
// Main Content View
struct ContentView: View {
    @StateObject private var userViewModel = AppContainer.shared.resolve(UserViewModel.self)!
    
    var body: some View {
        NavigationView {
            TabView {
                HomeView()
                    .tabItem {
                        Image(systemName: "house")
                        Text("Home")
                    }
                
                ProductsView()
                    .tabItem {
                        Image(systemName: "cart")
                        Text("Products")
                    }
                
                ProfileView()
                    .tabItem {
                        Image(systemName: "person")
                        Text("Profile")
                    }
            }
        }
        .environmentObject(userViewModel)
    }
}

// Home View
struct HomeView: View {
    @StateObject private var viewModel = HomeViewModel()
    
    var body: some View {
        NavigationView {
            ScrollView {
                LazyVStack(spacing: 16) {
                    ForEach(viewModel.featuredProducts) { product in
                        ProductCard(product: product)
                    }
                }
                .padding()
            }
            .navigationTitle("Home")
            .refreshable {
                await viewModel.loadFeaturedProducts()
            }
        }
        .onAppear {
            Task {
                await viewModel.loadFeaturedProducts()
            }
        }
    }
}

// Product Card Component
struct ProductCard: View {
    let product: Product
    @State private var isShowingDetail = false
    
    var body: some View {
        Button(action: {
            isShowingDetail = true
        }) {
            VStack(alignment: .leading, spacing: 8) {
                AsyncImage(url: URL(string: product.imageUrl)) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Rectangle()
                        .fill(Color.gray.opacity(0.3))
                        .overlay(
                            ProgressView()
                        )
                }
                .frame(height: 200)
                .clipped()
                .cornerRadius(12)
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(product.name)
                        .font(.headline)
                        .foregroundColor(.primary)
                    
                    Text(product.description)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                    
                    HStack {
                        Text("$\(product.price, specifier: "%.2f")")
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(.blue)
                        
                        Spacer()
                        
                        if product.inStock {
                            Text("In Stock")
                                .font(.caption)
                                .foregroundColor(.green)
                        } else {
                            Text("Out of Stock")
                                .font(.caption)
                                .foregroundColor(.red)
                        }
                    }
                }
                .padding(.horizontal, 8)
                .padding(.bottom, 8)
            }
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(radius: 4)
        }
        .buttonStyle(PlainButtonStyle())
        .sheet(isPresented: $isShowingDetail) {
            ProductDetailView(product: product)
        }
    }
}

// Custom Theme
struct AppTheme {
    static let primaryColor = Color.blue
    static let secondaryColor = Color.gray
    static let backgroundColor = Color(.systemBackground)
    static let textColor = Color(.label)
    
    static let cornerRadius: CGFloat = 12
    static let shadowRadius: CGFloat = 4
    static let padding: CGFloat = 16
}

// Custom Button Style
struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .padding()
            .background(AppTheme.primaryColor)
            .foregroundColor(.white)
            .cornerRadius(AppTheme.cornerRadius)
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}
```

## Data Layer

### Core Data
```swift
// Core Data Stack
class CoreDataStack {
    static let shared = CoreDataStack()
    
    lazy var persistentContainer: NSPersistentContainer = {
        let container = NSPersistentContainer(name: "MyApp")
        container.loadPersistentStores { _, error in
            if let error = error {
                fatalError("Core Data error: \(error)")
            }
        }
        return container
    }()
    
    var context: NSManagedObjectContext {
        return persistentContainer.viewContext
    }
    
    func saveContext() {
        if context.hasChanges {
            do {
                try context.save()
            } catch {
                print("Core Data save error: \(error)")
            }
        }
    }
}

// Core Data Models
@objc(User)
public class User: NSManagedObject {
    @NSManaged public var id: String
    @NSManaged public var name: String
    @NSManaged public var email: String
    @NSManaged public var avatarUrl: String?
    @NSManaged public var lastUpdated: Date
}

extension User {
    @nonobjc public class func fetchRequest() -> NSFetchRequest<User> {
        return NSFetchRequest<User>(entityName: "User")
    }
}

@objc(Product)
public class Product: NSManagedObject {
    @NSManaged public var id: String
    @NSManaged public var name: String
    @NSManaged public var productDescription: String
    @NSManaged public var price: Double
    @NSManaged public var imageUrl: String
    @NSManaged public var category: String
    @NSManaged public var inStock: Bool
    @NSManaged public var lastUpdated: Date
}

extension Product {
    @nonobjc public class func fetchRequest() -> NSFetchRequest<Product> {
        return NSFetchRequest<Product>(entityName: "Product")
    }
}

// Core Data Service
class CoreDataService {
    private let context: NSManagedObjectContext
    
    init(context: NSManagedObjectContext = CoreDataStack.shared.context) {
        self.context = context
    }
    
    func saveUser(_ user: UserProfile) throws {
        let fetchRequest: NSFetchRequest<User> = User.fetchRequest()
        fetchRequest.predicate = NSPredicate(format: "id == %@", user.id)
        
        let existingUser = try context.fetch(fetchRequest).first
        
        if let existingUser = existingUser {
            existingUser.name = user.name
            existingUser.email = user.email
            existingUser.avatarUrl = user.avatarUrl
            existingUser.lastUpdated = Date()
        } else {
            let newUser = User(context: context)
            newUser.id = user.id
            newUser.name = user.name
            newUser.email = user.email
            newUser.avatarUrl = user.avatarUrl
            newUser.lastUpdated = Date()
        }
        
        try context.save()
    }
    
    func getUser(by id: String) throws -> User? {
        let fetchRequest: NSFetchRequest<User> = User.fetchRequest()
        fetchRequest.predicate = NSPredicate(format: "id == %@", id)
        return try context.fetch(fetchRequest).first
    }
    
    func saveProducts(_ products: [Product]) throws {
        for product in products {
            let fetchRequest: NSFetchRequest<Product> = Product.fetchRequest()
            fetchRequest.predicate = NSPredicate(format: "id == %@", product.id)
            
            let existingProduct = try context.fetch(fetchRequest).first
            
            if let existingProduct = existingProduct {
                existingProduct.name = product.name
                existingProduct.productDescription = product.description
                existingProduct.price = product.price
                existingProduct.imageUrl = product.imageUrl
                existingProduct.category = product.category
                existingProduct.inStock = product.inStock
                existingProduct.lastUpdated = Date()
            } else {
                let newProduct = Product(context: context)
                newProduct.id = product.id
                newProduct.name = product.name
                newProduct.productDescription = product.description
                newProduct.price = product.price
                newProduct.imageUrl = product.imageUrl
                newProduct.category = product.category
                newProduct.inStock = product.inStock
                newProduct.lastUpdated = Date()
            }
        }
        
        try context.save()
    }
    
    func getProducts(by category: String? = nil) throws -> [Product] {
        let fetchRequest: NSFetchRequest<Product> = Product.fetchRequest()
        
        if let category = category {
            fetchRequest.predicate = NSPredicate(format: "category == %@", category)
        }
        
        fetchRequest.sortDescriptors = [NSSortDescriptor(key: "lastUpdated", ascending: false)]
        return try context.fetch(fetchRequest)
    }
}
```

### Network Layer
```swift
// Network Service
class NetworkService {
    private let session: URLSession
    private let baseURL = "https://api.example.com"
    
    init(session: URLSession = .shared) {
        self.session = session
    }
    
    func fetchUserProfile() -> AnyPublisher<UserProfile, Error> {
        let url = URL(string: "\(baseURL)/users/profile")!
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        // Add auth token if available
        if let token = KeychainService.shared.getAuthToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        return session.dataTaskPublisher(for: request)
            .map(\.data)
            .decode(type: UserProfile.self, decoder: JSONDecoder())
            .eraseToAnyPublisher()
    }
    
    func updateUserProfile(_ updates: UserProfileUpdates) -> AnyPublisher<UserProfile, Error> {
        let url = URL(string: "\(baseURL)/users/profile")!
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let token = KeychainService.shared.getAuthToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        do {
            request.httpBody = try JSONEncoder().encode(updates)
        } catch {
            return Fail(error: error).eraseToAnyPublisher()
        }
        
        return session.dataTaskPublisher(for: request)
            .map(\.data)
            .decode(type: UserProfile.self, decoder: JSONDecoder())
            .eraseToAnyPublisher()
    }
    
    func fetchProducts(page: Int = 1, limit: Int = 20, category: String? = nil) -> AnyPublisher<ProductsResponse, Error> {
        var components = URLComponents(string: "\(baseURL)/products")!
        var queryItems = [
            URLQueryItem(name: "page", value: "\(page)"),
            URLQueryItem(name: "limit", value: "\(limit)")
        ]
        
        if let category = category {
            queryItems.append(URLQueryItem(name: "category", value: category))
        }
        
        components.queryItems = queryItems
        
        var request = URLRequest(url: components.url!)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        return session.dataTaskPublisher(for: request)
            .map(\.data)
            .decode(type: ProductsResponse.self, decoder: JSONDecoder())
            .eraseToAnyPublisher()
    }
    
    func logout() -> AnyPublisher<Void, Error> {
        let url = URL(string: "\(baseURL)/auth/logout")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let token = KeychainService.shared.getAuthToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        return session.dataTaskPublisher(for: request)
            .map { _ in () }
            .eraseToAnyPublisher()
    }
}

// Data Models
struct UserProfile: Codable {
    let id: String
    let name: String
    let email: String
    let avatarUrl: String?
    let lastUpdated: TimeInterval
}

struct UserProfileUpdates: Codable {
    let name: String?
    let email: String?
    let avatarUrl: String?
}

struct Product: Codable, Identifiable {
    let id: String
    let name: String
    let description: String
    let price: Double
    let imageUrl: String
    let category: String
    let inStock: Bool
}

struct ProductsResponse: Codable {
    let products: [Product]
    let total: Int
    let page: Int
    let limit: Int
}
```

## Background Processing

### Background Tasks
```swift
// Background Task Manager
class BackgroundTaskManager {
    static let shared = BackgroundTaskManager()
    
    private var backgroundTasks: [UIBackgroundTaskIdentifier: () -> Void] = [:]
    
    func performBackgroundTask(_ task: @escaping () -> Void) {
        let taskID = UIApplication.shared.beginBackgroundTask { [weak self] in
            self?.endBackgroundTask(taskID)
        }
        
        backgroundTasks[taskID] = task
        
        DispatchQueue.global(qos: .background).async {
            task()
            DispatchQueue.main.async {
                self.endBackgroundTask(taskID)
            }
        }
    }
    
    private func endBackgroundTask(_ taskID: UIBackgroundTaskIdentifier) {
        if let task = backgroundTasks[taskID] {
            task()
            backgroundTasks.removeValue(forKey: taskID)
        }
        UIApplication.shared.endBackgroundTask(taskID)
    }
}

// Data Sync Service
class DataSyncService {
    private let userRepository: UserRepository
    private let productRepository: ProductRepository
    
    init(userRepository: UserRepository, productRepository: ProductRepository) {
        self.userRepository = userRepository
        self.productRepository = productRepository
    }
    
    func syncData() {
        BackgroundTaskManager.shared.performBackgroundTask { [weak self] in
            self?.performSync()
        }
    }
    
    private func performSync() {
        let group = DispatchGroup()
        
        // Sync user data
        group.enter()
        userRepository.getUserProfile()
            .sink(
                receiveCompletion: { _ in group.leave() },
                receiveValue: { _ in }
            )
            .store(in: &cancellables)
        
        // Sync products
        group.enter()
        productRepository.getProducts()
            .sink(
                receiveCompletion: { _ in group.leave() },
                receiveValue: { _ in }
            )
            .store(in: &cancellables)
        
        group.notify(queue: .main) {
            self.scheduleLocalNotification()
        }
    }
    
    private func scheduleLocalNotification() {
        let content = UNMutableNotificationContent()
        content.title = "Sync Complete"
        content.body = "Your data has been synchronized successfully"
        content.sound = .default
        
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
        let request = UNNotificationRequest(identifier: "sync_complete", content: content, trigger: trigger)
        
        UNUserNotificationCenter.current().add(request)
    }
}
```

## Security

### Keychain Service
```swift
// Keychain Service
class KeychainService {
    static let shared = KeychainService()
    
    private let service = "com.myapp.keychain"
    
    private init() {}
    
    func saveAuthToken(_ token: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: "\(service).auth_token",
            kSecValueData as String: token.data(using: .utf8)!
        ]
        
        SecItemDelete(query as CFDictionary)
        
        let status = SecItemAdd(query as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw KeychainError.saveFailed(status)
        }
    }
    
    func getAuthToken() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: "\(service).auth_token",
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        guard status == errSecSuccess,
              let data = result as? Data,
              let token = String(data: data, encoding: .utf8) else {
            return nil
        }
        
        return token
    }
    
    func deleteAuthToken() throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: "\(service).auth_token"
        ]
        
        let status = SecItemDelete(query as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError.deleteFailed(status)
        }
    }
}

enum KeychainError: Error {
    case saveFailed(OSStatus)
    case deleteFailed(OSStatus)
    case itemNotFound
}

// Biometric Authentication
class BiometricAuthService {
    private let context = LAContext()
    
    func canAuthenticate() -> Bool {
        var error: NSError?
        return context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
    }
    
    func authenticate(reason: String = "Authenticate to continue") -> AnyPublisher<Bool, Error> {
        return Future { [weak self] promise in
            guard let self = self else {
                promise(.failure(BiometricError.contextNotAvailable))
                return
            }
            
            self.context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: reason) { success, error in
                if let error = error {
                    promise(.failure(error))
                } else {
                    promise(.success(success))
                }
            }
        }
        .eraseToAnyPublisher()
    }
}

enum BiometricError: Error {
    case contextNotAvailable
}
```

## Testing

### Unit Testing
```swift
// ViewModel Tests
class UserViewModelTests: XCTestCase {
    var viewModel: UserViewModel!
    var mockRepository: MockUserRepository!
    
    override func setUp() {
        super.setUp()
        mockRepository = MockUserRepository()
        viewModel = UserViewModel(userRepository: mockRepository)
    }
    
    override func tearDown() {
        viewModel = nil
        mockRepository = nil
        super.tearDown()
    }
    
    func testLoadUserProfileSuccess() {
        // Given
        let expectedUser = UserProfile(id: "1", name: "Test User", email: "test@example.com", avatarUrl: nil, lastUpdated: Date().timeIntervalSince1970)
        mockRepository.mockUserProfile = expectedUser
        
        // When
        viewModel.loadUserProfile()
        
        // Then
        let expectation = XCTestExpectation(description: "User state updated")
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            switch self.viewModel.userState {
            case .success(let user):
                XCTAssertEqual(user.id, expectedUser.id)
                XCTAssertEqual(user.name, expectedUser.name)
            case .error(let message):
                XCTFail("Expected success but got error: \(message)")
            case .loading:
                XCTFail("Expected success but still loading")
            }
            expectation.fulfill()
        }
        
        wait(for: [expectation], timeout: 1.0)
    }
    
    func testLoadUserProfileError() {
        // Given
        let expectedError = NetworkError.serverError
        mockRepository.mockError = expectedError
        
        // When
        viewModel.loadUserProfile()
        
        // Then
        let expectation = XCTestExpectation(description: "Error state updated")
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            switch self.viewModel.userState {
            case .error(let message):
                XCTAssertEqual(message, expectedError.localizedDescription)
            case .success:
                XCTFail("Expected error but got success")
            case .loading:
                XCTFail("Expected error but still loading")
            }
            expectation.fulfill()
        }
        
        wait(for: [expectation], timeout: 1.0)
    }
}

// Mock Repository
class MockUserRepository: UserRepository {
    var mockUserProfile: UserProfile?
    var mockError: Error?
    
    override func getUserProfile() -> AnyPublisher<UserProfile, Error> {
        if let error = mockError {
            return Fail(error: error).eraseToAnyPublisher()
        } else if let user = mockUserProfile {
            return Just(user)
                .setFailureType(to: Error.self)
                .eraseToAnyPublisher()
        } else {
            return Fail(error: NetworkError.serverError).eraseToAnyPublisher()
        }
    }
}
```

### UI Testing
```swift
// UI Tests
class MyAppUITests: XCTestCase {
    var app: XCUIApplication!
    
    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launch()
    }
    
    func testHomeScreenDisplaysProducts() throws {
        // Given
        let productCard = app.collectionViews.cells.firstMatch
        
        // When/Then
        XCTAssertTrue(productCard.waitForExistence(timeout: 5))
        XCTAssertTrue(productCard.isHittable)
    }
    
    func testProductDetailNavigation() throws {
        // Given
        let productCard = app.collectionViews.cells.firstMatch
        
        // When
        productCard.tap()
        
        // Then
        let detailView = app.navigationBars.firstMatch
        XCTAssertTrue(detailView.waitForExistence(timeout: 2))
    }
    
    func testProfileTabNavigation() throws {
        // Given
        let profileTab = app.tabBars.buttons["Profile"]
        
        // When
        profileTab.tap()
        
        // Then
        let profileView = app.navigationBars["Profile"]
        XCTAssertTrue(profileView.waitForExistence(timeout: 2))
    }
}
```

## Performance Optimization

### Image Caching
```swift
// Image Cache Service
class ImageCacheService {
    static let shared = ImageCacheService()
    
    private let cache = NSCache<NSString, UIImage>()
    private let fileManager = FileManager.default
    private let cacheDirectory: URL
    
    private init() {
        cache.countLimit = 100
        cache.totalCostLimit = 50 * 1024 * 1024 // 50MB
        
        let paths = fileManager.urls(for: .cachesDirectory, in: .userDomainMask)
        cacheDirectory = paths[0].appendingPathComponent("ImageCache")
        
        try? fileManager.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
    }
    
    func getImage(for url: URL) -> AnyPublisher<UIImage?, Never> {
        let key = NSString(string: url.absoluteString)
        
        // Check memory cache first
        if let cachedImage = cache.object(forKey: key) {
            return Just(cachedImage).eraseToAnyPublisher()
        }
        
        // Check disk cache
        let fileName = url.lastPathComponent
        let fileURL = cacheDirectory.appendingPathComponent(fileName)
        
        if let data = try? Data(contentsOf: fileURL),
           let image = UIImage(data: data) {
            cache.setObject(image, forKey: key)
            return Just(image).eraseToAnyPublisher()
        }
        
        // Download from network
        return URLSession.shared.dataTaskPublisher(for: url)
            .map(\.data)
            .compactMap { UIImage(data: $0) }
            .handleEvents(receiveOutput: { [weak self] image in
                self?.cache.setObject(image, forKey: key)
                self?.saveToDisk(image: image, fileName: fileName)
            })
            .replaceError(with: nil)
            .eraseToAnyPublisher()
    }
    
    private func saveToDisk(image: UIImage, fileName: String) {
        guard let data = image.jpegData(compressionQuality: 0.8) else { return }
        let fileURL = cacheDirectory.appendingPathComponent(fileName)
        try? data.write(to: fileURL)
    }
    
    func clearCache() {
        cache.removeAllObjects()
        try? fileManager.removeItem(at: cacheDirectory)
        try? fileManager.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
    }
}
```

## Best Practices

### Code Organization
- Use MVVM architecture with Combine
- Implement proper separation of concerns
- Use dependency injection for better testability
- Follow Swift naming conventions
- Implement proper error handling

### Performance
- Use lazy loading for images and data
- Implement proper caching strategies
- Use pagination for large datasets
- Optimize Core Data queries
- Monitor memory usage

### Security
- Use Keychain for sensitive data storage
- Implement proper authentication
- Validate all user inputs
- Use HTTPS for network requests
- Follow security best practices

### Testing
- Write unit tests for ViewModels and Repositories
- Test UI components with SwiftUI testing
- Mock external dependencies
- Test error scenarios
- Implement integration tests
