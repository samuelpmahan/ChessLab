/** A text projection of an already materialized value. No execution or I/O. */
export function DebugMaterializer   (value  , view                  )        {
 return view(value);
}
