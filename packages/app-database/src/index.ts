import type {
  DriverAssignment,
  Item,
  Notification,
  Order,
  Store,
  UserProfile
} from "@spaceman/app-types";

export interface PageRequest {
  cursor?: string;
  limit: number;
}

export interface Page<TRecord> {
  records: TRecord[];
  nextCursor?: string;
}

export interface UserRepository {
  getById(userId: string): Promise<UserProfile | null>;
  listStaff(page: PageRequest): Promise<Page<UserProfile>>;
}

export interface StoreRepository {
  getById(storeId: string): Promise<Store | null>;
  listActive(page: PageRequest): Promise<Page<Store>>;
  listForMerchant(merchantId: string, page: PageRequest): Promise<Page<Store>>;
}

export interface ItemRepository {
  getById(itemId: string): Promise<Item | null>;
  listActiveForStore(storeId: string, page: PageRequest): Promise<Page<Item>>;
}

export interface OrderRepository {
  getById(orderId: string): Promise<Order | null>;
  listForCustomer(customerId: string, page: PageRequest): Promise<Page<Order>>;
  listOperationalForStore(storeId: string, page: PageRequest): Promise<Page<Order>>;
}

export interface DriverAssignmentRepository {
  getByOrderId(orderId: string): Promise<DriverAssignment | null>;
  listActiveForDriver(driverId: string, page: PageRequest): Promise<Page<DriverAssignment>>;
}

export interface NotificationRepository {
  listForRecipient(recipientId: string, page: PageRequest): Promise<Page<Notification>>;
}

export interface RepositoryBundle {
  users: UserRepository;
  stores: StoreRepository;
  items: ItemRepository;
  orders: OrderRepository;
  assignments: DriverAssignmentRepository;
  notifications: NotificationRepository;
}
