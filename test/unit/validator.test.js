const {
  validateProduct,
  validateProducts,
  isAmazonUrl,
  sanitizeProduct,
  hasMinimumData
} = require('../../src/utils/validator');
const { ValidationError } = require('../../src/utils/errors');

describe('Validator Utility', () => {
  describe('validateProduct', () => {
    const validProduct = {
      title: 'Test Product',
      price: '$10.00',
      imageUrl: 'https://example.com/image.jpg',
      productLink: 'https://amazon.com/dp/TEST123456',
      asin: 'TEST123456'
    };

    it('should validate a valid product', () => {
      const rules = { requireTitle: true, requireAsin: false };
      expect(() => validateProduct(validProduct, rules)).not.toThrow();
    });

    it('should throw ValidationError when title is missing and required', () => {
      const product = { ...validProduct, title: '' };
      const rules = { requireTitle: true };

      expect(() => validateProduct(product, rules)).toThrow(ValidationError);
    });

    it('should throw ValidationError when price is missing and required', () => {
      const product = { ...validProduct, price: '' };
      const rules = { requirePrice: true };

      expect(() => validateProduct(product, rules)).toThrow(ValidationError);
    });

    it('should throw ValidationError when ASIN is missing and required', () => {
      const product = { ...validProduct, asin: '' };
      const rules = { requireAsin: true };

      expect(() => validateProduct(product, rules)).toThrow(ValidationError);
    });

    it('should not throw when optional fields are missing', () => {
      const product = { ...validProduct, price: '', asin: '' };
      const rules = { requireTitle: true, requirePrice: false, requireAsin: false };

      expect(() => validateProduct(product, rules)).not.toThrow();
    });
  });

  describe('validateProducts', () => {
    const products = [
      {
        title: 'Product 1',
        price: '$10',
        imageUrl: 'img1.jpg',
        productLink: 'link1',
        asin: 'ASIN1'
      },
      {
        title: '',
        price: '$20',
        imageUrl: 'img2.jpg',
        productLink: 'link2',
        asin: 'ASIN2'
      },
      {
        title: 'Product 3',
        price: '$30',
        imageUrl: 'img3.jpg',
        productLink: 'link3',
        asin: 'ASIN3'
      }
    ];

    it('should separate valid and invalid products', () => {
      const rules = { requireTitle: true };
      const result = validateProducts(products, { rules });

      expect(result.valid).toHaveLength(2);
      expect(result.invalid).toHaveLength(1);
      expect(result.valid[0].title).toBe('Product 1');
      expect(result.valid[1].title).toBe('Product 3');
    });

    it('should throw on invalid when throwOnInvalid is true', () => {
      const rules = { requireTitle: true };

      expect(() => validateProducts(products, { rules, throwOnInvalid: true })).toThrow(
        ValidationError
      );
    });

    it('should return all products as valid when no validation rules', () => {
      const rules = {};
      const result = validateProducts(products, { rules });

      expect(result.valid).toHaveLength(3);
      expect(result.invalid).toHaveLength(0);
    });
  });

  describe('isAmazonUrl', () => {
    it('should return true for valid Amazon URLs', () => {
      expect(isAmazonUrl('https://www.amazon.com/product')).toBe(true);
      expect(isAmazonUrl('https://amazon.co.uk/store')).toBe(true);
      expect(isAmazonUrl('https://www.amazon.de/item')).toBe(true);
      expect(isAmazonUrl('https://amazon.fr/page')).toBe(true);
    });

    it('should return false for non-Amazon URLs', () => {
      expect(isAmazonUrl('https://www.google.com')).toBe(false);
      expect(isAmazonUrl('https://ebay.com')).toBe(false);
      expect(isAmazonUrl('invalid-url')).toBe(false);
    });

    it('should handle subdomains', () => {
      expect(isAmazonUrl('https://www.amazon.com/test')).toBe(true);
      expect(isAmazonUrl('https://smile.amazon.com/test')).toBe(true);
    });
  });

  describe('sanitizeProduct', () => {
    it('should trim whitespace from all fields', () => {
      const product = {
        title: '  Product  ',
        price: '  $10.00  ',
        imageUrl: '  image.jpg  ',
        productLink: '  link  ',
        asin: '  ASIN  '
      };

      const sanitized = sanitizeProduct(product);

      expect(sanitized.title).toBe('Product');
      expect(sanitized.price).toBe('$10.00');
      expect(sanitized.imageUrl).toBe('image.jpg');
      expect(sanitized.productLink).toBe('link');
      expect(sanitized.asin).toBe('ASIN');
    });

    it('should handle missing fields', () => {
      const product = {
        title: 'Product'
      };

      const sanitized = sanitizeProduct(product);

      expect(sanitized.title).toBe('Product');
      expect(sanitized.price).toBe('');
      expect(sanitized.imageUrl).toBe('');
      expect(sanitized.productLink).toBe('');
      expect(sanitized.asin).toBe('');
    });
  });

  describe('hasMinimumData', () => {
    it('should return true when product has title longer than minimum', () => {
      const product = { title: 'Valid Product', asin: '' };
      expect(hasMinimumData(product)).toBe(true);
    });

    it('should return true when product has ASIN', () => {
      const product = { title: '', asin: 'ASIN123456' };
      expect(hasMinimumData(product)).toBe(true);
    });

    it('should return false when title is too short and no ASIN', () => {
      const product = { title: 'AB', asin: '' };
      expect(hasMinimumData(product)).toBe(false);
    });

    it('should return false when no title and no ASIN', () => {
      const product = { title: '', asin: '' };
      expect(hasMinimumData(product)).toBe(false);
    });
  });
});
