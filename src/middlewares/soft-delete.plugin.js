const QUERY_TYPES = ["find", "findOne", "findOneAndUpdate", "countDocuments"];

export function softDeletePlugin(schema) {
  schema.add({ deleted_at: { type: Date, default: null } });

  schema.pre(QUERY_TYPES, function () {
    if (!("deleted_at" in (this._conditions || {})) && !this.options.withDeleted) {
      this.where({ deleted_at: null });
    }
  });

  schema.methods.softDelete = async function () {
    this.deleted_at = new Date();
    return this.save();
  };

  schema.statics.findWithDeleted = function (filter = {}) {
    return this.find(filter).setOptions({ withDeleted: true });
  };
}
