import '../../../core/data/json.dart';

class DesignAsset {
  const DesignAsset(this.id, this.label);
  final String id, label;
  factory DesignAsset.fromJson(Json data) =>
      DesignAsset(string(data['id']), string(data['label']));
}

class PieceSnapshot {
  PieceSnapshot(this.data);
  final Json data;
  Json get measurement => object(data['measurement']);
  Json get design => object(data['design']);
  List<({String label, String value})> get fields {
    final values = object(measurement['values']);
    return [
      for (final field in objects(measurement['fields']))
        if (values[field['id']] != null &&
            string(values[field['id']]).isNotEmpty)
          (label: string(field['label']), value: string(values[field['id']])),
    ];
  }

  List<DesignAsset> get assets {
    final all = [
      if (design['garmentImage'] != null) object(design['garmentImage']),
      if (measurement['image'] != null) object(measurement['image']),
      ...objects(design['choices']),
      ...objects(design['garmentReferences']),
      ...objects(design['references']),
    ];
    return {
      for (final asset in all) string(asset['id']): DesignAsset.fromJson(asset),
    }.values.where((asset) => asset.id.isNotEmpty).toList();
  }
}
