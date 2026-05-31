import { register } from "#services/auth.service.js";
import { createCategory } from "#services/categories.service.js";
import { createPublication } from "#services/publications.service.js";
import { createOrder } from "#services/orders.service.js";

export const CONSUMIDOR_DATA = {
  role: "CONSUMIDOR",
  first_name: "Juan",
  last_name: "Pérez",
  email: "juan@mail.com",
  password: "miPass123",
  confirm_password: "miPass123",
  phone: "1155667788",
  dni: "35123456",
};

export const COMERCIO_DATA = {
  role: "COMERCIO",
  first_name: "María",
  last_name: "López",
  email: "maria@comercio.com",
  password: "miPass123",
  confirm_password: "miPass123",
  phone: "1144556677",
  dni: "30987654",
  business_name: "Verdulería Don Mario",
  cuit: "20309876543",
  address: {
    formatted_address: "Av. Corrientes 1234, CABA",
    street: "Av. Corrientes",
    number: "1234",
    city: "CABA",
    province: "Buenos Aires",
    lat: -34.6037,
    lng: -58.3816,
  },
};

// Sin dirección embebida, para tests que crean la dirección manualmente
export const COMERCIO_DATA_NO_ADDR = {
  role: "COMERCIO",
  first_name: "María",
  last_name: "López",
  email: "maria@comercio.com",
  password: "miPass123",
  confirm_password: "miPass123",
  phone: "1144556677",
  dni: "30987654",
  business_name: "Verdulería Don Mario",
  cuit: "20309876543",
};

export const ADDRESS_DATA = {
  formatted_address: "Av. Corrientes 1234, CABA",
  street: "Av. Corrientes",
  number: "1234",
  city: "CABA",
  province: "Buenos Aires",
  lat: -34.6037,
  lng: -58.3816,
};

const defaultPubData = (categoryId) => ({
  title: "Mix de verduras",
  description: "Tomate y lechuga",
  original_price: 2000,
  final_price: 1000,
  expiry_date: new Date(Date.now() + 86400000),
  category_id: categoryId,
});

export const setupTwoUsers = async () => {
  const [commerce, consumer] = await Promise.all([
    register(COMERCIO_DATA),
    register(CONSUMIDOR_DATA),
  ]);
  return { commerceId: commerce.id, consumerId: consumer.id };
};

export const setupWithPublication = async () => {
  const { commerceId, consumerId } = await setupTwoUsers();
  const cat = await createCategory({ name: "Verduras" });
  const pub = await createPublication(commerceId, defaultPubData(cat.id));
  return { commerceId, consumerId, pubId: pub.id };
};

export const setupWithOrder = async () => {
  const { commerceId, consumerId, pubId } = await setupWithPublication();
  const order = await createOrder(consumerId, pubId);
  return { commerceId, consumerId, pubId, orderId: order.id };
};
