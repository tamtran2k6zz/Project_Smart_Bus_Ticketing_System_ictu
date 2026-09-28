import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

export function IsNotSameAs(property: string, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isNotSameAs',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: validationOptions || {
        message: `${propertyName} must not be identical to ${property}`,
      },
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as any)[relatedPropertyName];
          if (value === undefined || relatedValue === undefined) {
            return true;
          }
          return value !== relatedValue;
        },
      },
    });
  };
}
