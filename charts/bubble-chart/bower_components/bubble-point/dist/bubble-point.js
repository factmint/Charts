define( [ 'snap' ],
function( Snap ){

  return Snap.plugin(function( Snap, Element, Paper ){

    /**
     * Draws a circle with a given x, y and area
     * @param  {Number} x    
     * @param  {Number} y    
     * @param  {Number} area 
     * @return {Snap.Circle}      
     */
    Paper.prototype.bubblePoint = function( x, y, area ){

      var radius = Math.sqrt( area / Math.PI );

      return this.circle( x, y, radius ).addClass( "fm-scatter-bubble" );

    };

  });

} );