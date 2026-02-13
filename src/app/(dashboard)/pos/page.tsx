'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { Search, ShoppingCart, Trash2, Plus, Minus } from 'lucide-react'

interface Product {
  id: string
  name: string
  sku: string
  barcode: string | null
  base_price: string
  stock: number
  category_id: string | null
}

interface CartItem {
  product: Product
  quantity: number
}

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchProducts()
  }, [search])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      params.set('active', 'true')
      params.set('limit', '20')

      const response = await fetch(`/api/products?${params}`)
      const data = await response.json()
      setProducts(data.products || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const addToCart = (product: Product) => {
    const existingItem = cart.find((item) => item.product.id === product.id)

    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      )
    } else {
      setCart([...cart, { product, quantity: 1 }])
    }
  }

  const updateQuantity = (productId: string, delta: number) => {
    setCart(
      cart
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    )
  }

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product.id !== productId))
  }

  const calculateTotal = () => {
    return cart.reduce(
      (sum, item) => sum + parseFloat(item.product.base_price) * item.quantity,
      0
    )
  }

  const handleCheckout = async () => {
    if (cart.length === 0) return

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map((item) => ({
            product_id: item.product.id,
            quantity: item.quantity,
          })),
          channel: 'POS',
          payment_status: 'PAID',
          status: 'COMPLETED',
        }),
      })

      if (response.ok) {
        const order = await response.json()
        alert(`Orden creada: ${order.order_number}`)
        setCart([])
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error creating order:', error)
      alert('Error al crear la orden')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Punto de Venta</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products Section */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Productos</CardTitle>
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Buscar por nombre, SKU o código de barras..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {loading ? (
                    <p className="col-span-full text-center text-gray-500">
                      Cargando...
                    </p>
                  ) : products.length === 0 ? (
                    <p className="col-span-full text-center text-gray-500">
                      No hay productos disponibles
                    </p>
                  ) : (
                    products.map((product) => (
                      <Card
                        key={product.id}
                        className="cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => addToCart(product)}
                      >
                        <CardContent className="p-4">
                          <h3 className="font-semibold truncate">
                            {product.name}
                          </h3>
                          <p className="text-sm text-gray-500">{product.sku}</p>
                          <p className="text-lg font-bold text-primary mt-2">
                            {formatCurrency(parseFloat(product.base_price))}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Stock: {product.stock}
                          </p>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cart Section */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Carrito ({cart.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {cart.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">
                      El carrito está vacío
                    </p>
                  ) : (
                    <>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {cart.map((item) => (
                          <div
                            key={item.product.id}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {item.product.name}
                              </p>
                              <p className="text-sm text-gray-500">
                                {formatCurrency(
                                  parseFloat(item.product.base_price)
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  updateQuantity(item.product.id, -1)
                                }
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center">
                                {item.quantity}
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  updateQuantity(item.product.id, 1)
                                }
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => removeFromCart(item.product.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="border-t pt-4 space-y-2">
                        <div className="flex justify-between text-lg font-bold">
                          <span>Total:</span>
                          <span>{formatCurrency(calculateTotal())}</span>
                        </div>
                        <Button
                          className="w-full"
                          size="lg"
                          onClick={handleCheckout}
                        >
                          Procesar Pago
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
